import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, FileText, Percent } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FinancierTabProps {
 chantierId: string;
}

interface Budget {
 id: string;
 poste: string;
 montant_initial: number;
 montant_actuel: number;
 facture: number;
 avancement: number;
}

interface Avenant {
 id: string;
 numero: string;
 montant: number;
 date_demande: string;
}

interface Facture {
 id: string;
 numero: string;
 montant: number;
 date_emission: string;
 statut: string;
}

const FinancierTab: React.FC<FinancierTabProps> = ({ chantierId }) => {
 const [selectedPeriod, setSelectedPeriod] = useState<number>(6);

 // RÃ©cupÃ©rer le chantier
 const { data: chantier } = useQuery({
 queryKey: ['chantier', chantierId],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('chantiers')
 .select('*')
 .eq('id', chantierId)
 .single();
 if (error) throw error;
 return data;
 }
 });

 // RÃ©cupÃ©rer les avenants
 const { data: avenants = [] } = useQuery<Avenant[]>({
 queryKey: ['avenants', chantierId],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('avenants')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('date_demande', { ascending: false });
 if (error) throw error;
 return data || [];
 }
 });

 // RÃ©cupÃ©rer les factures
 const { data: factures = [] } = useQuery<Facture[]>({
 queryKey: ['factures', chantierId],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('factures')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('date_emission', { ascending: false });
 if (error) throw error;
 return data || [];
 }
 });

 // Budgets par poste (table budget_postes non disponible - utilisation des donnÃ©es chantier)
 const budgets: Budget[] = [];

 // Calculer les KPIs
 const kpis = useMemo(() => {
 const budgetInitial = chantier?.budget_initial || 0;
 const totalAvenants = avenants.reduce((sum, av) => sum + (av.montant || 0), 0);
 const budgetActuel = budgetInitial + totalAvenants;
 
 const totalFacture = factures
 .filter(f => f.statut !== 'avoir')
 .reduce((sum, f) => sum + (f.montant || 0), 0);
 
 const totalAvoir = factures
 .filter(f => f.statut === 'avoir')
 .reduce((sum, f) => sum + Math.abs(f.montant || 0), 0);
 
 const factureNet = totalFacture - totalAvoir;
 const resteAFacturer = budgetActuel - factureNet;
 
 const avancement = chantier?.avancement_physique || 0;
 const budgetConsomme = budgets.reduce((sum, b) => sum + (b.montant_actuel * b.avancement / 100), 0);
 const margeEstimee = budgetActuel - budgetConsomme;
 const margePourcentage = budgetActuel > 0 ? (margeEstimee / budgetActuel) * 100 : 0;

 // Alerte trÃ©sorerie
 const alerteTresorerie = budgetActuel > 0 ? (factureNet / budgetActuel * 100) < (avancement - 20) : false;

 return {
 budgetInitial,
 budgetActuel,
 totalAvenants,
 factureNet,
 resteAFacturer,
 margeEstimee,
 margePourcentage,
 avancement,
 budgetConsomme,
 alerteTresorerie
 };
 }, [chantier, avenants, factures, budgets]);

 // DonnÃ©es pour le graphique Budget vs FacturÃ© vs Avancement
 const chartBudgetData = useMemo(() => {
 return [{
 name: 'Chantier',
 'Budget Initial': kpis.budgetInitial,
 'Budget Actuel': kpis.budgetActuel,
 'FacturÃ©': kpis.factureNet,
 'Avancement (%)': kpis.avancement
 }];
 }, [kpis]);

 // DonnÃ©es pour l'Ã©volution mensuelle
 const evolutionMensuelle = useMemo(() => {
 const startDate = subMonths(new Date(), selectedPeriod - 1);
 const months = eachMonthOfInterval({
 start: startOfMonth(startDate),
 end: endOfMonth(new Date())
 });

 return months.map(month => {
 const monthStart = startOfMonth(month);
 const monthEnd = endOfMonth(month);

 const facturesMois = factures.filter(f => {
 const dateEmission = new Date(f.date_emission);
 return dateEmission >= monthStart && dateEmission <= monthEnd && f.statut !== 'avoir';
 });

 const montantFacture = facturesMois.reduce((sum, f) => sum + (f.montant || 0), 0);

 return {
 mois: format(month, 'MMM yyyy', { locale: fr }),
 facture: montantFacture,
 budget: kpis.budgetActuel / selectedPeriod
 };
 });
 }, [factures, selectedPeriod, kpis.budgetActuel]);

 // DonnÃ©es rÃ©cap par poste
 const recapPostes = useMemo(() => {
 return budgets.map(budget => ({
 poste: budget.poste,
 budgetInitial: budget.montant_initial,
 budgetActuel: budget.montant_actuel,
 consomme: budget.montant_actuel * budget.avancement / 100,
 avancement: budget.avancement,
 reste: budget.montant_actuel * (1 - budget.avancement / 100)
 }));
 }, [budgets]);

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
 <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderLeftColor: color }}>
 <div className="flex items-center justify-between mb-2">
 <h3 className="text-sm font-medium text-gray-600">{title}</h3>
 <div className={`p-2 rounded-lg bg-${color}-50`}>
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
 <div className="space-y-6 p-6">
 {/* Alerte TrÃ©sorerie */}
 {kpis.alerteTresorerie && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
 <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <div>
 <h4 className="text-sm font-semibold text-red-900">Alerte TrÃ©sorerie</h4>
 <p className="text-sm text-red-700 mt-1">
 La facturation est infÃ©rieure de plus de 20% Ã  l'avancement physique du chantier.
 Il est recommandÃ© d'Ã©mettre une facture d'acompte.
 </p>
 </div>
 </div>
 )}

 {/* KPIs */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
 <KPICard
 title="Budget Initial"
 value={formatEuro(kpis.budgetInitial)}
 icon={<DollarSign className="w-5 h-5 text-blue-600" />}
 color="#3B82F6"
 />
 <KPICard
 title="Budget Actuel"
 value={formatEuro(kpis.budgetActuel)}
 subtitle={kpis.totalAvenants > 0 ? `+${formatEuro(kpis.totalAvenants)} avenants` : 'Aucun avenant'}
 icon={<FileText className="w-5 h-5 text-indigo-600" />}
 color="#6366F1"
 trend={kpis.totalAvenants > 0 ? 'up' : 'neutral'}
 />
 <KPICard
 title="FacturÃ©"
 value={formatEuro(kpis.factureNet)}
 subtitle={`${(kpis.budgetActuel > 0 ? ((kpis.factureNet / kpis.budgetActuel) * 100) : 0).toFixed(1)}% du budget`}
 icon={<FileText className="w-5 h-5 text-green-600" />}
 color="#10B981"
 />
 <KPICard
 title="Reste Ã  Facturer"
 value={formatEuro(kpis.resteAFacturer)}
 subtitle={`${(kpis.budgetActuel > 0 ? ((kpis.resteAFacturer / kpis.budgetActuel) * 100) : 0).toFixed(1)}%`}
 icon={<DollarSign className="w-5 h-5 text-orange-600" />}
 color="#F59E0B"
 />
 <KPICard
 title="Marge EstimÃ©e"
 value={formatEuro(kpis.margeEstimee)}
 subtitle={`${kpis.margePourcentage.toFixed(1)}%`}
 icon={<Percent className="w-5 h-5 text-purple-600" />}
 color="#8B5CF6"
 trend={kpis.margePourcentage > 15 ? 'up' : kpis.margePourcentage < 5 ? 'down' : 'neutral'}
 />
 </div>

 {/* Graphique Budget vs FacturÃ© vs Avancement */}
 <div className="bg-white rounded-lg shadow p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs FacturÃ© vs Avancement</h3>
 <ResponsiveContainer width="100%" height={300}>
 <BarChart data={chartBudgetData}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="name" />
 <YAxis />
 <Tooltip formatter={(value: any) => formatEuro(Number(value))} />
 <Legend />
 <Bar dataKey="Budget Initial" fill="#3B82F6" />
 <Bar dataKey="Budget Actuel" fill="#6366F1" />
 <Bar dataKey="FacturÃ©" fill="#10B981" />
 </BarChart>
 </ResponsiveContainer>
 <div className="mt-4 p-4 bg-gray-50 rounded-lg">
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Avancement Physique</span>
 <span className="text-lg font-bold text-gray-900">{kpis.avancement.toFixed(1)}%</span>
 </div>
 <div className="mt-2 w-full bg-gray-200 rounded-full h-3">
 <div
 className="bg-blue-600 h-3 rounded-full transition-all duration-300"
 style={{ width: `${kpis.avancement}%` }}
 />
 </div>
 </div>
 </div>

 {/* Tableau RÃ©cap par Poste */}
 <div className="bg-white rounded-lg shadow overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-semibold text-gray-900">RÃ©capitulatif par Poste</h3>
 </div>
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poste</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Initial</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Actuel</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ConsommÃ©</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avancement</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reste</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {recapPostes.map((poste, index) => (
 <tr key={index} className="hover:bg-gray-50">
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{poste.poste}</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatEuro(poste.budgetInitial)}</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{formatEuro(poste.budgetActuel)}</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatEuro(poste.consomme)}</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
 <div className="flex items-center justify-end gap-2">
 <span className="text-gray-900 font-medium">{poste.avancement.toFixed(1)}%</span>
 <div className="w-20 bg-gray-200 rounded-full h-2">
 <div
 className={`h-2 rounded-full ${
 poste.avancement < 50 ? 'bg-red-500' :
 poste.avancement < 80 ? 'bg-yellow-500' :
 'bg-green-500'
 }`}
 style={{ width: `${poste.avancement}%` }}
 />
 </div>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatEuro(poste.reste)}</td>
 </tr>
 ))}
 {recapPostes.length > 0 && (
 <tr className="bg-gray-50 font-semibold">
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">TOTAL</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
 {formatEuro(recapPostes.reduce((sum, p) => sum + p.budgetInitial, 0))}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
 {formatEuro(recapPostes.reduce((sum, p) => sum + p.budgetActuel, 0))}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
 {formatEuro(recapPostes.reduce((sum, p) => sum + p.consomme, 0))}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
 {recapPostes.length > 0
 ? (recapPostes.length > 0 ? (recapPostes.reduce((sum, p) => sum + p.avancement, 0) / recapPostes.length) : 0).toFixed(1)
 : 0}%
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
 {formatEuro(recapPostes.reduce((sum, p) => sum + p.reste, 0))}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Evolution Mensuelle */}
 <div className="bg-white rounded-lg shadow p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-gray-900">Ãvolution Mensuelle</h3>
 <select
 value={selectedPeriod}
 onChange={(e) => setSelectedPeriod(Number(e.target.value))}
 className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value={3}>3 derniers mois</option>
 <option value={6}>6 derniers mois</option>
 <option value={12}>12 derniers mois</option>
 </select>
 </div>
 <ResponsiveContainer width="100%" height={300}>
 <LineChart data={evolutionMensuelle}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="mois" />
 <YAxis />
 <Tooltip formatter={(value: any) => formatEuro(Number(value))} />
 <Legend />
 <Line type="monotone" dataKey="facture" stroke="#10B981" strokeWidth={2} name="FacturÃ©" />
 <Line type="monotone" dataKey="budget" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" name="Budget Moyen" />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>
 );
};

export default FinancierTab;