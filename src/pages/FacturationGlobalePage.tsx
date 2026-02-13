import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, AlertTriangle, TrendingUp, Calendar, Building2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Facture {
 id: string;
 chantier_id: string;
 numero: string;
 date_emission: string;
 montant_ht: number;
 montant_ttc: number;
 date_echeance: string;
 statut: 'emise' | 'payee' | 'en_retard' | 'avoir';
}

interface Chantier {
 id: string;
 nom: string;
 budget_initial: number;
}

const FacturationGlobalePage: React.FC = () => {
 const navigate = useNavigate();
 const [selectedPeriod, setSelectedPeriod] = useState<number>(6);

 // Récupérer tous les chantiers
 const { data: chantiers = [] } = useQuery<Chantier[]>({
 queryKey: ['chantiers'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('chantiers')
 .select('id, nom, budget_initial')
 .eq('statut', 'en_cours')
 .order('nom');
 if (error) throw error;
 return data || [];
 }
 });

 // Récupérer toutes les factures
 const { data: factures = [], isLoading } = useQuery<Facture[]>({
 queryKey: ['factures-global'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('factures')
 .select('*')
 .order('date_emission', { ascending: false });
 if (error) throw error;
 return data || [];
 }
 });

 // KPIs globaux
 const kpis = useMemo(() => {
 const maintenant = new Date();
 const debutMois = startOfMonth(maintenant);
 const finMois = endOfMonth(maintenant);

 // Total facturé ce mois
 const totalMois = factures
 .filter(f => {
 const date = parseISO(f.date_emission);
 return date >= debutMois && date <= finMois && f.statut !== 'avoir';
 })
 .reduce((sum, f) => sum + f.montant_ht, 0);

 // Impayés
 const impayes = factures
 .filter(f => f.statut === 'emise' || (f.statut === 'emise' && isPast(parseISO(f.date_echeance))))
 .reduce((sum, f) => sum + f.montant_ttc, 0);

 // Factures en retard
 const enRetard = factures.filter(f => 
 f.statut === 'emise' && isPast(parseISO(f.date_echeance))
 ).length;

 // Trésorerie prévisionnelle (30 jours)
 const dans30Jours = new Date();
 dans30Jours.setDate(dans30Jours.getDate() + 30);
 
 const tresoPrevisionnelle = factures
 .filter(f => {
 if (f.statut !== 'emise') return false;
 const echeance = parseISO(f.date_echeance);
 return echeance <= dans30Jours;
 })
 .reduce((sum, f) => sum + f.montant_ttc, 0);

 // Total facturé global
 const totalFacture = factures
 .filter(f => f.statut !== 'avoir')
 .reduce((sum, f) => sum + f.montant_ht, 0);

 return {
 totalMois,
 impayes,
 enRetard,
 tresoPrevisionnelle,
 totalFacture
 };
 }, [factures]);

 // Facturation mensuelle
 const facturationMensuelle = useMemo(() => {
 const startDate = subMonths(new Date(), selectedPeriod - 1);
 const months = eachMonthOfInterval({
 start: startOfMonth(startDate),
 end: endOfMonth(new Date())
 });

 return months.map(month => {
 const monthStart = startOfMonth(month);
 const monthEnd = endOfMonth(month);

 const facturesMois = factures.filter(f => {
 const dateEmission = parseISO(f.date_emission);
 return dateEmission >= monthStart && dateEmission <= monthEnd && f.statut !== 'avoir';
 });

 const emis = facturesMois.reduce((sum, f) => sum + f.montant_ht, 0);
 const payes = facturesMois
 .filter(f => f.statut === 'payee')
 .reduce((sum, f) => sum + f.montant_ht, 0);

 return {
 mois: format(month, 'MMM yyyy', { locale: fr }),
 emis,
 payes
 };
 });
 }, [factures, selectedPeriod]);

 // Facturation par chantier
 const facturationParChantier = useMemo(() => {
 const chantierMap = new Map<string, { nom: string; total: number }>();

 factures
 .filter(f => f.statut !== 'avoir')
 .forEach(f => {
 const chantier = chantiers.find(c => c.id === f.chantier_id);
 if (chantier) {
 const current = chantierMap.get(f.chantier_id) || { nom: chantier.nom, total: 0 };
 chantierMap.set(f.chantier_id, {
 nom: chantier.nom,
 total: current.total + f.montant_ht
 });
 }
 });

 return Array.from(chantierMap.values())
 .sort((a, b) => b.total - a.total)
 .slice(0, 5);
 }, [factures, chantiers]);

 // Répartition par statut
 const repartitionStatut = useMemo(() => {
 const stats = {
 payee: 0,
 emise: 0,
 en_retard: 0
 };

 factures
 .filter(f => f.statut !== 'avoir')
 .forEach(f => {
 if (f.statut === 'payee') {
 stats.payee += f.montant_ht;
 } else if (f.statut === 'emise' && isPast(parseISO(f.date_echeance))) {
 stats.en_retard += f.montant_ht;
 } else {
 stats.emise += f.montant_ht;
 }
 });

 return [
 { name: 'Payées', value: stats.payee, color: '#10B981' },
 { name: 'Émises', value: stats.emise, color: '#3B82F6' },
 { name: 'En retard', value: stats.en_retard, color: '#EF4444' }
 ].filter(s => s.value > 0);
 }, [factures]);

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
 alert?: boolean;
 }> = ({ title, value, subtitle, icon, color, alert }) => (
 <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${alert ? 'border-red-500' : ''}`} style={{ borderLeftColor: alert ? undefined : color }}>
 <div className="flex items-center justify-between mb-2">
 <h3 className="text-sm font-medium text-gray-600">{title}</h3>
 <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${color}20` }}>
 {icon}
 </div>
 </div>
 <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
 {subtitle && (
 <p className="text-sm text-gray-500">{subtitle}</p>
 )}
 </div>
 );

 return (
 <div className="min-h-screen bg-gray-50 p-6">
 <div className="max-w-7xl mx-auto space-y-6">
 {/* En-tête */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">Facturation Globale</h1>
 <p className="text-gray-600 mt-1">Vue d'ensemble de la facturation de tous les chantiers</p>
 </div>
 <button
 onClick={() => navigate('/chantiers')}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
 >
 Retour aux chantiers
 </button>
 </div>

 {/* KPIs */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <KPICard
 title="Facturé ce mois"
 value={formatEuro(kpis.totalMois)}
 subtitle={format(new Date(), 'MMMM yyyy', { locale: fr })}
 icon={<DollarSign className="w-5 h-5 text-green-600" />}
 color="#10B981"
 />
 <KPICard
 title="Impayés"
 value={formatEuro(kpis.impayes)}
 subtitle={`${kpis.enRetard} facture(s) en retard`}
 icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
 color="#EF4444"
 alert={kpis.enRetard > 0}
 />
 <KPICard
 title="Trésorerie prévisionnelle"
 value={formatEuro(kpis.tresoPrevisionnelle)}
 subtitle="À 30 jours"
 icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
 color="#3B82F6"
 />
 <KPICard
 title="Total facturé"
 value={formatEuro(kpis.totalFacture)}
 subtitle="Tous chantiers confondus"
 icon={<DollarSign className="w-5 h-5 text-purple-600" />}
 color="#8B5CF6"
 />
 </div>

 {/* Alertes trésorerie */}
 {kpis.enRetard > 0 && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
 <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <div>
 <h4 className="text-sm font-semibold text-red-900">Alerte Trésorerie</h4>
 <p className="text-sm text-red-700 mt-1">
 Vous avez {kpis.enRetard} facture(s) en retard pour un montant total de {formatEuro(kpis.impayes)}.
 Relancez vos clients pour améliorer votre trésorerie.
 </p>
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Graphique facturation mensuelle */}
 <div className="bg-white rounded-xl shadow-sm p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-gray-900">Facturation Mensuelle</h3>
 <select
 value={selectedPeriod}
 onChange={(e) => setSelectedPeriod(Number(e.target.value))}
 className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value={3}>3 mois</option>
 <option value={6}>6 mois</option>
 <option value={12}>12 mois</option>
 </select>
 </div>
 <ResponsiveContainer width="100%" height={300}>
 <BarChart data={facturationMensuelle}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="mois" />
 <YAxis />
 <Tooltip formatter={(value: any) => formatEuro(Number(value))} />
 <Legend />
 <Bar dataKey="emis" fill="#3B82F6" name="Émis" />
 <Bar dataKey="payes" fill="#10B981" name="Payés" />
 </BarChart>
 </ResponsiveContainer>
 </div>

 {/* Répartition par statut */}
 <div className="bg-white rounded-xl shadow-sm p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Statut</h3>
 <ResponsiveContainer width="100%" height={300}>
 <PieChart>
 <Pie
 data={repartitionStatut}
 cx="50%"
 cy="50%"
 labelLine={false}
 label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
 outerRadius={100}
 fill="#8884d8"
 dataKey="value"
 >
 {repartitionStatut.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip formatter={(value: any) => formatEuro(Number(value))} />
 </PieChart>
 </ResponsiveContainer>
 <div className="mt-4 space-y-2">
 {repartitionStatut.map((stat, index) => (
 <div key={index} className="flex items-center justify-between text-sm">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
 <span className="text-gray-600">{stat.name}</span>
 </div>
 <span className="font-medium text-gray-900">{formatEuro(stat.value)}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Top 5 chantiers par facturation */}
 <div className="bg-white rounded-xl shadow-sm p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Chantiers par Facturation</h3>
 <div className="space-y-3">
 {facturationParChantier.map((chantier, index) => (
 <div key={index} className="flex items-center gap-3">
 <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
 <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-900 truncate">{chantier.nom}</p>
 <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
 <div
 className="bg-blue-600 h-2 rounded-full"
 style={{ width: `${(chantier.total / facturationParChantier[0].total) * 100}%` }}
 />
 </div>
 </div>
 <div className="flex-shrink-0 text-sm font-semibold text-gray-900">
 {formatEuro(chantier.total)}
 </div>
 </div>
 ))}
 {facturationParChantier.length === 0 && (
 <p className="text-sm text-gray-500 text-center py-8">Aucune donnée disponible</p>
 )}
 </div>
 </div>

 {/* Liste des factures récentes */}
 <div className="bg-white rounded-xl shadow-sm p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Factures Récentes</h3>
 <div className="space-y-3">
 {factures.slice(0, 10).map((facture) => {
 const chantier = chantiers.find(c => c.id === facture.chantier_id);
 const isEnRetard = facture.statut === 'emise' && isPast(parseISO(facture.date_echeance));
 
 return (
 <div
 key={facture.id}
 className={`flex items-center justify-between p-3 rounded-lg border ${
 isEnRetard ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
 } cursor-pointer transition-colors`}
 onClick={() => navigate(`/chantiers/${facture.chantier_id}`)}
 >
 <div className="flex items-center gap-3 flex-1 min-w-0">
 <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-900 truncate">{facture.numero}</p>
 <p className="text-xs text-gray-500 truncate">{chantier?.nom || 'Chantier inconnu'}</p>
 </div>
 </div>
 <div className="flex items-center gap-4 flex-shrink-0">
 <div className="text-right">
 <p className="text-sm font-semibold text-gray-900">{formatEuro(facture.montant_ttc)}</p>
 <p className="text-xs text-gray-500">
 {format(parseISO(facture.date_emission), 'dd/MM/yyyy')}
 </p>
 </div>
 <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
 facture.statut === 'payee' ? 'bg-green-100 text-green-800' :
 isEnRetard ? 'bg-red-100 text-red-800' :
 'bg-blue-100 text-blue-800'
 }`}>
 {isEnRetard ? 'En retard' : facture.statut === 'payee' ? 'Payée' : 'Émise'}
 </span>
 </div>
 </div>
 );
 })}
 {factures.length === 0 && (
 <p className="text-sm text-gray-500 text-center py-8">Aucune facture enregistrée</p>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default FacturationGlobalePage;