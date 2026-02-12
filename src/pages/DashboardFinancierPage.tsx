import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Building2, Percent, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Chantier {
 id: string;
 nom: string;
 client: string;
 budget_initial: number;
 avancement_physique: number;
 statut: string;
 date_debut: string;
 date_fin_prevue: string;
}

interface Facture {
 id: string;
 chantier_id: string;
 montant_ht: number;
 montant_ttc: number;
 date_emission: string;
 statut: string;
}

interface Avenant {
 id: string;
 chantier_id: string;
 montant: number;
}

interface BudgetPoste {
 id: string;
 chantier_id: string;
 montant_actuel: number;
 avancement: number;
}

const DashboardFinancierPage: React.FC = () => {
 const navigate = useNavigate();
 const [selectedPeriod, setSelectedPeriod] = useState<number>(12);

 // RÃ©cupÃ©rer les chantiers
 const { data: chantiers = [] } = useQuery<Chantier[]>({
 queryKey: ['chantiers'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('chantiers')
 .select('*')
 .order('nom');
 if (error) throw error;
 return data || [];
 }
 });

 // RÃ©cupÃ©rer les factures
 const { data: factures = [] } = useQuery<Facture[]>({
 queryKey: ['factures-all'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('factures')
 .select('*')
 .order('date_emission', { ascending: false });
 if (error) throw error;
 return data || [];
 }
 });

 // RÃ©cupÃ©rer les avenants
 const { data: avenants = [] } = useQuery<Avenant[]>({
 queryKey: ['avenants-all'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('avenants')
 .select('*');
 if (error) throw error;
 return data || [];
 }
 });

 // RÃ©cupÃ©rer les budgets postes
 const { data: budgetsPostes = [] } = useQuery<BudgetPoste[]>({
 queryKey: ['budgets-postes-all'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('budget_postes')
 .select('*');
 if (error) throw error;
 return data || [];
 }
 });

 // KPIs globaux
 const kpisGlobaux = useMemo(() => {
 // CA Total
 const caTotal = factures
 .filter(f => f.statut !== 'avoir')
 .reduce((sum, f) => sum + f.montant_ht, 0);

 // Budget total initial
 const budgetTotalInitial = chantiers.reduce((sum, c) => sum + (c.(budget_initial || 0)), 0);

 // Budget total avec avenants
 const totalAvenants = avenants.reduce((sum, a) => sum + (a.montant || 0), 0);
 const budgetTotalActuel = budgetTotalInitial + totalAvenants;

 // Budget consommÃ©
 const budgetConsomme = budgetsPostes.reduce(
 (sum, b) => sum + (b.montant_actuel * b.avancement / 100),
 0
 );

 // Marge globale
 const margeGlobale = budgetTotalActuel - budgetConsomme;
 const margePourcentage = budgetTotalActuel > 0 ? (margeGlobale / budgetTotalActuel) * 100 : 0;

 // Taux de facturation
 const tauxFacturation = budgetTotalActuel > 0 ? (caTotal / budgetTotalActuel) * 100 : 0;

 // Nombre de chantiers
 const nbChantiersActifs = chantiers.filter(c => c.statut === 'en_cours').length;
 const nbChantiersTotal = chantiers.length;

 return {
 caTotal,
 budgetTotalInitial,
 budgetTotalActuel,
 totalAvenants,
 budgetConsomme,
 margeGlobale,
 margePourcentage,
 tauxFacturation,
 nbChantiersActifs,
 nbChantiersTotal
 };
 }, [chantiers, factures, avenants, budgetsPostes]);

 // Performance par chantier
 const performanceChantiers = useMemo(() => {
 return chantiers
 .filter(c => c.statut === 'en_cours')
 .map(chantier => {
 const avenantChantier = avenants
 .filter(a => a.chantier_id === chantier.id)
 .reduce((sum, a) => sum + a.montant, 0);
 
 const budgetActuel = (chantier.(budget_initial || 0)) + avenantChantier;

 const facturesChantier = factures.filter(
 f => f.chantier_id === chantier.id && f.statut !== 'avoir'
 );
 const facture = facturesChantier.reduce((sum, f) => sum + f.montant_ht, 0);

 const budgetsChantier = budgetsPostes.filter(b => b.chantier_id === chantier.id);
 const consomme = budgetsChantier.reduce(
 (sum, b) => sum + (b.montant_actuel * b.avancement / 100),
 0
 );

 const marge = budgetActuel - consomme;
 const margePourcentage = budgetActuel > 0 ? (marge / budgetActuel) * 100 : 0;

 return {
 id: chantier.id,
 nom: chantier.nom,
 client: chantier.client,
 budgetActuel,
 facture,
 consomme,
 marge,
 margePourcentage,
 avancement: chantier.avancement_physique || 0
 };
 })
 .sort((a, b) => b.budgetActuel - a.budgetActuel);
 }, [chantiers, factures, avenants, budgetsPostes]);

 // Ãvolution CA mensuel
 const evolutionCA = useMemo(() => {
 const startDate = subMonths(new Date(), selectedPeriod - 1);
 const months = eachMonthOfInterval({
 start: startOfMonth(startDate),
 end: endOfMonth(new Date())
 });

 return months.map(month => {
 const monthStart = startOfMonth(month);
 const monthEnd = endOfMonth(month);

 const facturesMois = factures.filter(f => {
 const date = new Date(f.date_emission);
 return date >= monthStart && date <= monthEnd && f.statut !== 'avoir';
 });

 const ca = facturesMois.reduce((sum, f) => sum + f.montant_ht, 0);

 return {
 mois: format(month, 'MMM yy', { locale: fr }),
 ca,
 objectif: kpisGlobaux.budgetTotalActuel / selectedPeriod
 };
 });
 }, [factures, selectedPeriod, kpisGlobaux.budgetTotalActuel]);

 // RÃ©partition budget par chantier
 const repartitionBudget = useMemo(() => {
 return performanceChantiers
 .slice(0, 5)
 .map(c => ({
 name: c.nom,
 value: c.budgetActuel
 }));
 }, [performanceChantiers]);

 const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

 const formatEuro = (value: number) => {
 return new Intl.NumberFormat('fr-FR', {
 style: 'currency',
 currency: 'EUR',
 minimumFractionDigits: 0,
 maximumFractionDigits: 0
 }).format(value);
 };

 const KPICard: React.FC<{
 title: string;
 value: string | number;
 subtitle?: string;
 icon: React.ReactNode;
 color: string;
 trend?: 'up' | 'down' | 'neutral';
 }> = ({ title, value, subtitle, icon, color, trend }) => (
 <div className="bg-white rounded-xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: color }}>
 <div className="flex items-center justify-between mb-2">
 <h3 className="text-sm font-medium text-gray-600">{title}</h3>
 <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}20` }}>
 {icon}
 </div>
 </div>
 <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
 {subtitle && (
 <div className="flex items-center gap-1 text-sm text-gray-500">
 {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
 {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
 <span>{subtitle}</span>
 </div>
 )}
 </div>
 );

 return (
 <div className="min-h-screen bg-gray-50 p-6">
 <div className="max-w-7xl mx-auto space-y-6">
 {/* En-tÃªte */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">Dashboard Financier</h1>
 <p className="text-gray-600 mt-1">Vue directeur - Pilotage financier global</p>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => navigate('/facturation-globale')}
 className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
 >
 Facturation Globale
 </button>
 <button
 onClick={() => navigate('/chantiers')}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
 >
 Retour aux chantiers
 </button>
 </div>
 </div>

 {/* KPIs Principaux */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <KPICard
 title="CA Total"
 value={formatEuro(kpisGlobaux.caTotal)}
 subtitle={`${kpisGlobaux.(Number(tauxFacturation) || 0).toFixed(1)}% du budget`}
 icon={<DollarSign className="w-5 h-5 text-green-600" />}
 color="#10B981"
 trend="up"
 />
 <KPICard
 title="Marge Globale"
 value={formatEuro(kpisGlobaux.margeGlobale)}
 subtitle={`${kpisGlobaux.(Number(margePourcentage) || 0).toFixed(1)}%`}
 icon={<Percent className="w-5 h-5 text-blue-600" />}
 color="#3B82F6"
 trend={kpisGlobaux.margePourcentage > 15 ? 'up' : kpisGlobaux.margePourcentage < 5 ? 'down' : 'neutral'}
 />
 <KPICard
 title="Budget ConsommÃ©"
 value={formatEuro(kpisGlobaux.budgetConsomme)}
 subtitle={`sur ${formatEuro(kpisGlobaux.budgetTotalActuel)}`}
 icon={<TrendingDown className="w-5 h-5 text-orange-600" />}
 color="#F59E0B"
 />
 <KPICard
 title="Chantiers Actifs"
 value={`${kpisGlobaux.nbChantiersActifs} / ${kpisGlobaux.nbChantiersTotal}`}
 subtitle="En cours"
 icon={<Building2 className="w-5 h-5 text-purple-600" />}
 color="#8B5CF6"
 />
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Ãvolution CA Mensuel */}
 <div className="bg-white rounded-xl shadow-sm p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-gray-900">Ãvolution CA Mensuel</h3>
 <select
 value={selectedPeriod}
 onChange={(e) => setSelectedPeriod(Number(e.target.value))}
 className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value={6}>6 mois</option>
 <option value={12}>12 mois</option>
 <option value={24}>24 mois</option>
 </select>
 </div>
 <ResponsiveContainer width="100%" height={300}>
 <LineChart data={evolutionCA}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="mois" />
 <YAxis />
 <Tooltip formatter={(value: any) => formatEuro(Number(value))} />
 <Legend />
 <Line type="monotone" dataKey="ca" stroke="#10B981" strokeWidth={2} name="CA RÃ©alisÃ©" />
 <Line type="monotone" dataKey="objectif" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" name="Objectif" />
 </LineChart>
 </ResponsiveContainer>
 </div>

 {/* RÃ©partition Budget Top 5 */}
 <div className="bg-white rounded-xl shadow-sm p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">RÃ©partition Budget - Top 5 Chantiers</h3>
 <ResponsiveContainer width="100%" height={300}>
 <PieChart>
 <Pie
 data={repartitionBudget}
 cx="50%"
 cy="50%"
 labelLine={false}
 label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
 outerRadius={100}
 fill="#8884d8"
 dataKey="value"
 >
 {repartitionBudget.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip formatter={(value: any) => formatEuro(Number(value))} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Tableau Performance par Chantier */}
 <div className="bg-white rounded-xl shadow-sm overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-gray-900">Performance par Chantier</h3>
 <span className="text-sm text-gray-500">{performanceChantiers.length} chantiers actifs</span>
 </div>
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chantier</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">FacturÃ©</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ConsommÃ©</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Marge</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avancement</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {performanceChantiers.map((chantier) => (
 <tr
 key={chantier.id}
 className="hover:bg-gray-50 cursor-pointer"
 onClick={() => navigate(`/chantiers/${chantier.id}`)}
 >
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center gap-2">
 <Building2 className="w-4 h-4 text-gray-400" />
 <span className="text-sm font-medium text-gray-900">{chantier.nom}</span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{chantier.client}</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
 {formatEuro(chantier.budgetActuel)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
 {formatEuro(chantier.facture)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
 {formatEuro(chantier.consomme)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
 <div className="flex flex-col items-end">
 <span className={`font-medium ${
 chantier.margePourcentage > 15 ? 'text-green-600' :
 chantier.margePourcentage < 5 ? 'text-red-600' :
 'text-gray-900'
 }`}>
 {formatEuro(chantier.marge)}
 </span>
 <span className="text-xs text-gray-500">{chantier.(Number(margePourcentage) || 0).toFixed(1)}%</span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
 <div className="flex items-center justify-end gap-2">
 <span className="text-gray-900 font-medium">{chantier.(Number(avancement) || 0).toFixed(0)}%</span>
 <div className="w-20 bg-gray-200 rounded-full h-2">
 <div
 className={`h-2 rounded-full ${
 chantier.avancement < 50 ? 'bg-red-500' :
 chantier.avancement < 80 ? 'bg-yellow-500' :
 'bg-green-500'
 }`}
 style={{ width: `${chantier.avancement}%` }}
 />
 </div>
 </div>
 </td>
 </tr>
 ))}
 {performanceChantiers.length === 0 && (
 <tr>
 <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
 Aucun chantier actif
 </td>
 </tr>
 )}
 </tbody>
 {performanceChantiers.length > 0 && (
 <tfoot className="bg-gray-50 border-t-2 border-gray-300">
 <tr className="font-semibold">
 <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">TOTAL</td>
 <td className="px-6 py-4 text-sm text-gray-900 text-right">
 {formatEuro(performanceChantiers.reduce((sum, c) => sum + c.budgetActuel, 0))}
 </td>
 <td className="px-6 py-4 text-sm text-gray-900 text-right">
 {formatEuro(performanceChantiers.reduce((sum, c) => sum + c.facture, 0))}
 </td>
 <td className="px-6 py-4 text-sm text-gray-900 text-right">
 {formatEuro(performanceChantiers.reduce((sum, c) => sum + c.consomme, 0))}
 </td>
 <td className="px-6 py-4 text-sm text-gray-900 text-right">
 {formatEuro(performanceChantiers.reduce((sum, c) => sum + c.marge, 0))}
 </td>
 <td className="px-6 py-4"></td>
 </tr>
 </tfoot>
 )}
 </table>
 </div>
 </div>

 {/* Alertes et Recommandations */}
 <div className="bg-white rounded-xl shadow-sm p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-orange-500" />
 Alertes et Recommandations
 </h3>
 <div className="space-y-3">
 {kpisGlobaux.margePourcentage < 10 && (
 <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
 <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-red-900">Marge globale faible</p>
 <p className="text-sm text-red-700 mt-1">
 La marge globale est de {kpisGlobaux.(Number(margePourcentage) || 0).toFixed(1)}%. Il est recommandÃ© de rÃ©viser les coÃ»ts et d'optimiser les budgets.
 </p>
 </div>
 </div>
 )}

 {performanceChantiers.filter(c => c.margePourcentage < 5).length > 0 && (
 <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
 <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-orange-900">
 {performanceChantiers.filter(c => c.margePourcentage < 5).length} chantier(s) avec marge critique
 </p>
 <p className="text-sm text-orange-700 mt-1">
 Certains chantiers ont une marge infÃ©rieure Ã  5%. Analysez les dÃ©passements budgÃ©taires.
 </p>
 </div>
 </div>
 )}

 {kpisGlobaux.tauxFacturation < 50 && (
 <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
 <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-yellow-900">Taux de facturation Ã  amÃ©liorer</p>
 <p className="text-sm text-yellow-700 mt-1">
 Seulement {kpisGlobaux.(Number(tauxFacturation) || 0).toFixed(1)}% du budget est facturÃ©. Ãmettez des factures d'acompte.
 </p>
 </div>
 </div>
 )}

 {performanceChantiers.length > 0 && 
 performanceChantiers.filter(c => c.margePourcentage < 5).length === 0 &&
 kpisGlobaux.margePourcentage >= 10 &&
 kpisGlobaux.tauxFacturation >= 50 && (
 <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
 <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-green-900">Situation financiÃ¨re saine</p>
 <p className="text-sm text-green-700 mt-1">
 Tous les indicateurs sont au vert. Continuez sur cette lancÃ©e !
 </p>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
};

export default DashboardFinancierPage;