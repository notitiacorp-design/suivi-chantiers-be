import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, addWeeks, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Clock, Users, TrendingUp, X } from 'lucide-react';

interface ChargeAffaire {
 id: string;
 nom: string;
 prenom: string;
 email: string;
}

interface Chantier {
 id: string;
 nom: string;
 charge_affaire_id: string;
 heures_estimees: number;
 date_debut: string;
 date_fin_prevue: string;
 statut: string;
 phase: string;
}

interface CelluleCharge {
 heures: number;
 chantiers: number;
 chantiersDetails: Array<{
 id: string;
 nom: string;
 heures: number;
 phase: string;
 }>;
}

interface ChargeParSemaine {
 [caId: string]: {
 [semaine: string]: CelluleCharge;
 };
}

const TableauChargePage: React.FC = () => {
 const [selectedCell, setSelectedCell] = useState<{
 caId: string;
 semaine: string;
 data: CelluleCharge;
 caName: string;
 } | null>(null);
 const [nbSemaines, setNbSemaines] = useState(12);

 // Récupération des chargés d'affaires
 const { data: chargesAffaires = [], isLoading: loadingCA } = useQuery({
 queryKey: ['charges-affaires'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('users')
 .select('id, nom, prenom, email')
 .eq('role', 'charge_affaire')
 .order('nom');
 if (error) throw error;
 return data as ChargeAffaire[];
 },
 });

 // Récupération des chantiers actifs
 const { data: chantiers = [], isLoading: loadingChantiers } = useQuery({
 queryKey: ['chantiers-charge'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('chantiers')
 .select('id, nom, charge_affaire_id, heures_estimees, date_debut, date_fin_prevue, statut, phase')
 .in('statut', ['actif', 'en_cours', 'planifie']);
 if (error) throw error;
 return data as Chantier[];
 },
 });

 // Calcul des semaines à afficher
 const semaines = useMemo(() => {
 const debut = startOfWeek(new Date(), { locale: fr });
 return Array.from({ length: nbSemaines }, (_, i) => addWeeks(debut, i));
 }, [nbSemaines]);

 // Calcul de la charge par CA et par semaine
 const chargeParSemaine: ChargeParSemaine = useMemo(() => {
 const result: ChargeParSemaine = {};

 chargesAffaires.forEach((ca) => {
 result[ca.id] = {};
 semaines.forEach((semaine) => {
 result[ca.id][format(semaine, 'yyyy-MM-dd')] = {
 heures: 0,
 chantiers: 0,
 chantiersDetails: [],
 };
 });
 });

 chantiers.forEach((chantier) => {
 if (!chantier.charge_affaire_id) return;

 const dateDebut = new Date(chantier.date_debut);
 const dateFin = new Date(chantier.date_fin_prevue);
 const dureeSemaines = Math.ceil(
 (dateFin.getTime() - dateDebut.getTime()) / (7 * 24 * 60 * 60 * 1000)
 );
 const heuresParSemaine = dureeSemaines > 0 ? chantier.heures_estimees / dureeSemaines : 0;

 semaines.forEach((semaine) => {
 const dateComparaison = semaine;
 if (dateComparaison >= dateDebut && dateComparaison <= dateFin) {
 const key = format(semaine, 'yyyy-MM-dd');
 if (result[chantier.charge_affaire_id]?.[key]) {
 result[chantier.charge_affaire_id][key].heures += heuresParSemaine;
 result[chantier.charge_affaire_id][key].chantiers += 1;
 result[chantier.charge_affaire_id][key].chantiersDetails.push({
 id: chantier.id,
 nom: chantier.nom,
 heures: heuresParSemaine,
 phase: chantier.phase,
 });
 }
 }
 });
 });

 return result;
 }, [chargesAffaires, chantiers, semaines]);

 // Données pour le graphique radar
 const dataRadar = useMemo(() => {
 return chargesAffaires.map((ca) => {
 const totalHeures = Object.values(chargeParSemaine[ca.id] || {}).reduce(
 (sum, cell) => sum + cell.heures,
 0
 );
 const moyenneHebdo = totalHeures / nbSemaines;
 return {
 nom: `${ca.prenom} ${ca.nom}`,
 charge: Math.round(moyenneHebdo),
 };
 });
 }, [chargesAffaires, chargeParSemaine, nbSemaines]);

 const getCouleurCellule = (heures: number): string => {
 if (heures === 0) return 'bg-gray-50 text-gray-400';
 if (heures < 35) return 'bg-green-100 text-green-800 border-green-300';
 if (heures <= 45) return 'bg-orange-100 text-orange-800 border-orange-300';
 return 'bg-red-100 text-red-800 border-red-300';
 };

 if (loadingCA || loadingChantiers) {
 return (
 <div className="flex items-center justify-center h-screen">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
 {/* En-tête */}
 <div className="bg-white rounded-lg shadow-md p-6">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
 <Clock className="w-8 h-8 text-blue-600" />
 Tableau de Charge
 </h1>
 <p className="text-gray-600 mt-1">Vue d'ensemble de la charge de travail par chargé d'affaires</p>
 </div>
 <div className="flex items-center gap-4">
 <label className="text-sm font-medium text-gray-700">Nombre de semaines:</label>
 <select
 value={nbSemaines}
 onChange={(e) => setNbSemaines(Number(e.target.value))}
 className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value={8}>8 semaines</option>
 <option value={12}>12 semaines</option>
 <option value={16}>16 semaines</option>
 <option value={26}>26 semaines</option>
 </select>
 </div>
 </div>

 {/* Statistiques */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
 <div className="flex items-center gap-3">
 <Users className="w-6 h-6 text-blue-600" />
 <div>
 <p className="text-sm text-blue-600 font-medium">Chargés d'affaires</p>
 <p className="text-2xl font-bold text-blue-900">{chargesAffaires.length}</p>
 </div>
 </div>
 </div>
 <div className="bg-green-50 rounded-lg p-4 border border-green-200">
 <div className="flex items-center gap-3">
 <TrendingUp className="w-6 h-6 text-green-600" />
 <div>
 <p className="text-sm text-green-600 font-medium">Chantiers actifs</p>
 <p className="text-2xl font-bold text-green-900">{chantiers.length}</p>
 </div>
 </div>
 </div>
 <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
 <div className="flex items-center gap-3">
 <Clock className="w-6 h-6 text-purple-600" />
 <div>
 <p className="text-sm text-purple-600 font-medium">Charge moyenne hebdo</p>
 <p className="text-2xl font-bold text-purple-900">
 {Math.round(
 chantiers.reduce((sum, c) => sum + (c.heures_estimees || 0), 0) /
 chargesAffaires.length /
 nbSemaines
 )}h
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Graphique Radar */}
 <div className="bg-white rounded-lg shadow-md p-6">
 <h2 className="text-xl font-bold text-gray-900 mb-4">Charge moyenne par chargé d'affaires</h2>
 <ResponsiveContainer width="100%" height={400}>
 <RadarChart data={dataRadar}>
 <PolarGrid />
 <PolarAngleAxis dataKey="nom" tick={{ fontSize: 12 }} />
 <PolarRadiusAxis angle={90} domain={[0, 50]} />
 <Radar name="Heures/semaine" dataKey="charge" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
 <Tooltip />
 </RadarChart>
 </ResponsiveContainer>
 </div>

 {/* Tableau de charge */}
 <div className="bg-white rounded-lg shadow-md overflow-hidden">
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-100 sticky top-0 z-10">
 <tr>
 <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-100 z-20">
 Chargé d'affaires
 </th>
 {semaines.map((semaine) => (
 <th
 key={format(semaine, 'yyyy-MM-dd')}
 className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px]"
 >
 <div>{format(semaine, 'EEE', { locale: fr })}</div>
 <div className="text-gray-500 font-normal">{format(semaine, 'dd/MM')}</div>
 </th>
 ))}
 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100 sticky right-0 z-20">
 Total
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {chargesAffaires.map((ca) => {
 const totalHeures = Object.values(chargeParSemaine[ca.id] || {}).reduce(
 (sum, cell) => sum + cell.heures,
 0
 );
 const totalChantiers = new Set(
 Object.values(chargeParSemaine[ca.id] || {}).flatMap((cell) =>
 cell.chantiersDetails.map((c) => c.id)
 )
 ).size;

 return (
 <tr key={ca.id} className="hover:bg-gray-50 transition-colors">
 <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 sticky left-0 bg-white z-10 border-r">
 <div className="text-sm">{ca.prenom} {ca.nom}</div>
 <div className="text-xs text-gray-500">{ca.email}</div>
 </td>
 {semaines.map((semaine) => {
 const key = format(semaine, 'yyyy-MM-dd');
 const cellData = chargeParSemaine[ca.id]?.[key];
 const heures = Math.round(cellData?.heures || 0);
 const nbChantiers = cellData?.chantiers || 0;

 return (
 <td
 key={key}
 onClick={() =>
 cellData && heures > 0
 ? setSelectedCell({
 caId: ca.id,
 semaine: key,
 data: cellData,
 caName: `${ca.prenom} ${ca.nom}`,
 })
 : null
 }
 className={`px-3 py-3 text-center text-sm border ${getCouleurCellule(heures)} ${
 heures > 0 ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
 }`}
 >
 {heures > 0 && (
 <>
 <div className="font-bold text-base">{heures}h</div>
 <div className="text-xs opacity-75">{nbChantiers} chantier{nbChantiers > 1 ? 's' : ''}</div>
 </>
 )}
 </td>
 );
 })}
 <td className="px-4 py-3 text-center font-semibold bg-gray-50 sticky right-0 z-10 border-l">
 <div className="text-base">{Math.round(totalHeures)}h</div>
 <div className="text-xs text-gray-600">{totalChantiers} chantier{totalChantiers > 1 ? 's' : ''}</div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Légende */}
 <div className="bg-gray-50 px-6 py-4 border-t flex items-center gap-6 justify-center">
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
 <span className="text-sm text-gray-700">{'< 35h (charge normale)'}</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
 <span className="text-sm text-gray-700">35-45h (charge élevée)</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
 <span className="text-sm text-gray-700">{"> 45h (surcharge)"}</span>
 </div>
 </div>
 </div>

 {/* Modal détail cellule */}
 {selectedCell && (
 <div
 className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
 onClick={() => setSelectedCell(null)}
 >
 <div
 className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
 <div>
 <h3 className="text-xl font-bold">{selectedCell.caName}</h3>
 <p className="text-blue-100 text-sm">
 Semaine du {format(new Date(selectedCell.semaine), 'dd MMMM yyyy', { locale: fr })}
 </p>
 </div>
 <button
 onClick={() => setSelectedCell(null)}
 className="text-white hover:bg-blue-800 rounded-full p-2 transition-colors"
 >
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="p-6">
 <div className="grid grid-cols-2 gap-4 mb-6">
 <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
 <p className="text-sm text-blue-600 font-medium">Total heures</p>
 <p className="text-3xl font-bold text-blue-900">{Math.round(selectedCell.data.heures)}h</p>
 </div>
 <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
 <p className="text-sm text-purple-600 font-medium">Nombre de chantiers</p>
 <p className="text-3xl font-bold text-purple-900">{selectedCell.data.chantiers}</p>
 </div>
 </div>

 <h4 className="text-lg font-semibold text-gray-900 mb-3">Détail des chantiers</h4>
 <div className="space-y-2 max-h-[400px] overflow-y-auto">
 {selectedCell.data.chantiersDetails.map((chantier, idx) => (
 <div
 key={`${chantier.id}-${idx}`}
 className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
 >
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <h5 className="font-semibold text-gray-900">{chantier.nom}</h5>
 <p className="text-sm text-gray-600 mt-1">
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
 {chantier.phase}
 </span>
 </p>
 </div>
 <div className="text-right">
 <p className="text-lg font-bold text-gray-900">{Math.round(chantier.heures)}h</p>
 <p className="text-xs text-gray-500">cette semaine</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default TableauChargePage;