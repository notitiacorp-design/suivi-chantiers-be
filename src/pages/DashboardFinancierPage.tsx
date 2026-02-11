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

 // Récupérer les chantiers
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

 // Récupérer les factures
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

 // Récupérer les avenants
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

 // Récupérer les budgets postes
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
 const budgetTotalInitial = chantiers.reduce((sum, c) => sum + (c.budget_initial || 0), 0);

 // Budget total avec avenants
 const totalAvenants = avenants.reduce((sum, a) => sum + (a.montant || 0), 0);
 const budgetTotalActuel = budgetTotalInitial + totalAvenants;

 // Budget consommé
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
 
 const budgetActuel = (chantier.budget_initial || 0) + avenantChantier;

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

 // Évolution CA mensuel
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

 // Répartition budget par chantier
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
 <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderLeftColor: color }}>
 <div className="flex items-center justify-between mb-2">
 <h3 className="text-sm font-medium text-gray-600">{title}</h3>
 <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
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
 {/* En-tête */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">Dashboard Financier</h1>
 <p className="text-gray-600 mt-1">Vue directeur - Pilotage financier global</p>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => navigate('/facturation-globale')}
 className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
 >
 Facturation Globale
 </button>
 <button
 onClick={() => navigate('/chantiers')}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
 subtitle={`${kpisGlobaux.tauxFacturation.toFixed(1)}% du budget`}
 icon={<DollarSign className="w-5 h-5 text-green-600" />}
 color="#10B981"
 trend="up"
 />
 <KPICard
 title="Marge Globale"
 value={formatEuro(kpisGlobaux.margeGlobale)}
 subtitle={`${kpisGlobaux.margePourcentage.toFixed(1)}%`}
 icon={<Percent className="w-5 h-5 text-blue-600" />}
 color="#3B82F6"
 trend={kpisGlobaux.margePourcentage > 15 ? 'up' : kpisGlobaux.margePourcentage < 5 ? 'down' : 'neutral'}
 />
 <KPICard
 title="Budget Consommé"
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
 {/* Évolution CA Mensuel */}
 <div className="bg-white rounded-lg shadow p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-gray-900">Évolution CA Mensuel</h3>
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
 <Line type="monotone" dataKey="ca" stroke="#10B981" strokeWidth={2} name="CA Réalisé" />
 <Line type="monotone" dataKey="objectif" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" name="Objectif" />
 </LineChart>
 </ResponsiveContainer>
 </div>

 {/* Répartition Budget Top 5 */}
 <div className="bg-white rounded-lg shadow p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition Budget - Top 5 Chantiers</h3>
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
 <div className="bg-white rounded-lg shadow overflow-hidden">
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
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Facturé</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Consommé</th>
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
 <span className="text-xs text-gray-500">{chantier.margePourcentage.toFixed(1)}%</span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
 <div className="flex items-center justify-end gap-2">
 <span className="text-gray-900 font-medium">{chantier.avancement.toFixed(0)}%</span>
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
 <div className="bg-white rounded-lg shadow p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-orange-500" />
 Alertes et Recommandations
 </h3>
 <div className="space-y-3">
 {kpisGlobaux.margePourcentage < 10 && (
 <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
 <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-red-900">Marge globale faible</p>
 <p className="text-sm text-red-700 mt-1">
 La marge globale est de {kpisGlobaux.margePourcentage.toFixed(1)}%. Il est recommandé de réviser les coûts et d'optimiser les budgets.
 </p>
 </div>
 </div>
 )}

 {performanceChantiers.filter(c => c.margePourcentage < 5).length > 0 && (
 <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
 <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-orange-900">
 {performanceChantiers.filter(c => c.margePourcentage < 5).length} chantier(s) avec marge critique
 </p>
 <p className="text-sm text-orange-700 mt-1">
 Certains chantiers ont une marge inférieure à 5%. Analysez les dépassements budgétaires.
 </p>
 </div>
 </div>
 )}

 {kpisGlobaux.tauxFacturation < 50 && (
 <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
 <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-yellow-900">Taux de facturation à améliorer</p>
 <p className="text-sm text-yellow-700 mt-1">
 Seulement {kpisGlobaux.tauxFacturation.toFixed(1)}% du budget est facturé. Émettez des factures d'acompte.
 </p>
 </div>
 </div>
 )}

 {performanceChantiers.length > 0 && 
 performanceChantiers.filter(c => c.margePourcentage < 5).length === 0 &&
 kpisGlobaux.margePourcentage >= 10 &&
 kpisGlobaux.tauxFacturation >= 50 && (
 <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
 <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-green-900">Situation financière saine</p>
 <p className="text-sm text-green-700 mt-1">
 Tous les indicateurs sont au vert. Continuez sur cette lancée !
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

---

Partie 2 : Documents, Avenants, Commandes et Sous-traitance

// ============================================
// FICHIER 1: src/components/chantier/DocumentsTab.tsx
// ============================================

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Download, Upload, Search, X, Eye, Trash2, FileText, Image as ImageIcon, File } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type DocumentCategory = 'plans' | 'pv_reunion' | 'doe' | 'dgd' | 'fiches_techniques' | 'photos' | 'autres';

interface Document {
 id: string;
 chantier_id: string;
 nom: string;
 categorie: DocumentCategory;
 type_fichier: string;
 url: string;
 taille: number;
 version: string;
 uploade_par: string;
 created_at: string;
 updated_at: string;
}

interface DocumentsTabProps {
 chantierId: string;
}

const CATEGORIES = [
 { value: 'plans', label: 'Plans', icon: FileText },
 { value: 'pv_reunion', label: 'PV Réunion', icon: FileText },
 { value: 'doe', label: 'DOE', icon: FileText },
 { value: 'dgd', label: 'DGD', icon: FileText },
 { value: 'fiches_techniques', label: 'Fiches Techniques', icon: FileText },
 { value: 'photos', label: 'Photos', icon: ImageIcon },
 { value: 'autres', label: 'Autres', icon: File },
] as const;

export default function DocumentsTab({ chantierId }: DocumentsTabProps) {
 const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
 const [searchTerm, setSearchTerm] = useState('');
 const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
 const queryClient = useQueryClient();

 const { data: documents = [], isLoading } = useQuery({
 queryKey: ['documents', chantierId, selectedCategory],
 queryFn: async () => {
 let query = supabase
 .from('documents')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('created_at', { ascending: false });

 if (selectedCategory !== 'all') {
 query = query.eq('categorie', selectedCategory);
 }

 const { data, error } = await query;
 if (error) throw error;
 return data as Document[];
 },
 });

 const uploadMutation = useMutation({
 mutationFn: async ({ file, category, version }: { file: File; category: DocumentCategory; version: string }) => {
 const fileExt = file.name.split('.').pop();
 const fileName = `${chantierId}/${category}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

 const { error: uploadError } = await supabase.storage
 .from('documents')
 .upload(fileName, file);

 if (uploadError) throw uploadError;

 const { data: { publicUrl } } = supabase.storage
 .from('documents')
 .getPublicUrl(fileName);

 const { data: userData } = await supabase.auth.getUser();

 const { data, error } = await supabase
 .from('documents')
 .insert({
 chantier_id: chantierId,
 nom: file.name,
 categorie: category,
 type_fichier: file.type,
 url: publicUrl,
 taille: file.size,
 version: version,
 uploade_par: userData.user?.email || 'Inconnu',
 })
 .select()
 .single();

 if (error) throw error;
 return data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['documents', chantierId] });
 },
 });

 const deleteMutation = useMutation({
 mutationFn: async (documentId: string) => {
 const document = documents.find(d => d.id === documentId);
 if (!document) throw new Error('Document non trouvé');

 const filePath = document.url.split('/documents/')[1];
 await supabase.storage.from('documents').remove([filePath]);

 const { error } = await supabase
 .from('documents')
 .delete()
 .eq('id', documentId);

 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['documents', chantierId] });
 },
 });

 const onDrop = useCallback((acceptedFiles: File[], category: DocumentCategory) => {
 acceptedFiles.forEach(file => {
 const version = prompt('Version du document (ex: V1, V2):', 'V1');
 if (version) {
 uploadMutation.mutate({ file, category, version });
 }
 });
 }, [uploadMutation]);

 const filteredDocuments = documents.filter(doc =>
 doc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
 doc.version.toLowerCase().includes(searchTerm.toLowerCase())
 );

 const documentsByCategory = CATEGORIES.reduce((acc, cat) => {
 acc[cat.value] = filteredDocuments.filter(d => d.categorie === cat.value);
 return acc;
 }, {} as Record<DocumentCategory, Document[]>);

 const downloadDocument = async (doc: Document) => {
 const link = document.createElement('a');
 link.href = doc.url;
 link.download = doc.nom;
 link.click();
 };

 const formatFileSize = (bytes: number) => {
 if (bytes < 1024) return bytes + ' B';
 if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
 return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
 };

 const isImage = (type: string) => type.startsWith('image/');
 const isPDF = (type: string) => type === 'application/pdf';

 return (
 <div className="space-y-6">
 {/* Header avec recherche */}
 <div className="flex justify-between items-center">
 <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
 <div className="relative w-96">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
 <input
 type="text"
 placeholder="Rechercher un document..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 </div>

 {/* Filtres par catégorie */}
 <div className="flex gap-2 overflow-x-auto pb-2">
 <button
 onClick={() => setSelectedCategory('all')}
 className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
 selectedCategory === 'all'
 ? 'bg-blue-600 text-white'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 Tous ({documents.length})
 </button>
 {CATEGORIES.map(cat => (
 <button
 key={cat.value}
 onClick={() => setSelectedCategory(cat.value)}
 className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
 selectedCategory === cat.value
 ? 'bg-blue-600 text-white'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 <cat.icon className="h-4 w-4" />
 {cat.label} ({documentsByCategory[cat.value]?.length || 0})
 </button>
 ))}
 </div>

 {/* Grille de documents par catégorie */}
 {isLoading ? (
 <div className="flex justify-center items-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 ) : (
 <div className="space-y-8">
 {CATEGORIES.map(category => {
 const categoryDocs = selectedCategory === 'all' 
 ? documentsByCategory[category.value]
 : selectedCategory === category.value
 ? filteredDocuments
 : [];

 if (selectedCategory !== 'all' && selectedCategory !== category.value) return null;
 if (categoryDocs.length === 0 && selectedCategory === 'all') return null;

 return (
 <CategorySection
 key={category.value}
 category={category}
 documents={categoryDocs}
 onDrop={(files) => onDrop(files, category.value)}
 onPreview={setPreviewDocument}
 onDownload={downloadDocument}
 onDelete={(id) => deleteMutation.mutate(id)}
 isUploading={uploadMutation.isPending}
 />
 );
 })}
 </div>
 )}

 {/* Modal de prévisualisation */}
 {previewDocument && (
 <PreviewModal
 document={previewDocument}
 onClose={() => setPreviewDocument(null)}
 onDownload={() => downloadDocument(previewDocument)}
 />
 )}
 </div>
 );
}

interface CategorySectionProps {
 category: typeof CATEGORIES[number];
 documents: Document[];
 onDrop: (files: File[]) => void;
 onPreview: (doc: Document) => void;
 onDownload: (doc: Document) => void;
 onDelete: (id: string) => void;
 isUploading: boolean;
}

function CategorySection({
 category,
 documents,
 onDrop,
 onPreview,
 onDownload,
 onDelete,
 isUploading
}: CategorySectionProps) {
 const { getRootProps, getInputProps, isDragActive } = useDropzone({
 onDrop,
 accept: category.value === 'photos'
 ? { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }
 : {
 'application/pdf': ['.pdf'],
 'application/msword': ['.doc'],
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
 'application/vnd.ms-excel': ['.xls'],
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
 'image/*': ['.png', '.jpg', '.jpeg'],
 },
 });

 const formatFileSize = (bytes: number) => {
 if (bytes < 1024) return bytes + ' B';
 if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
 return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
 };

 const isImage = (type: string) => type.startsWith('image/');
 const isPDF = (type: string) => type === 'application/pdf';

 return (
 <div className="bg-white rounded-lg shadow-md p-6">
 <div className="flex items-center gap-3 mb-4">
 <category.icon className="h-6 w-6 text-blue-600" />
 <h3 className="text-lg font-semibold text-gray-900">{category.label}</h3>
 <span className="text-sm text-gray-500">({documents.length})</span>
 </div>

 {/* Zone de drop */}
 <div
 {...getRootProps()}
 className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer mb-6 ${
 isDragActive
 ? 'border-blue-500 bg-blue-50'
 : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
 }`}
 >
 <input {...getInputProps()} />
 <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600 mb-1">
 {isDragActive
 ? 'Déposez les fichiers ici...'
 : 'Glissez-déposez des fichiers ici ou cliquez pour sélectionner'}
 </p>
 <p className="text-sm text-gray-500">
 {category.value === 'photos' ? 'Images uniquement' : 'PDF, Word, Excel, Images'}
 </p>
 {isUploading && (
 <div className="mt-4">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
 <p className="text-sm text-gray-600 mt-2">Upload en cours...</p>
 </div>
 )}
 </div>

 {/* Grille de documents */}
 {documents.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {documents.map(doc => (
 <div
 key={doc.id}
 className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
 >
 {/* Miniature */}
 <div className="h-48 bg-gray-100 flex items-center justify-center relative group">
 {isImage(doc.type_fichier) ? (
 <img
 src={doc.url}
 alt={doc.nom}
 className="w-full h-full object-cover"
 />
 ) : isPDF(doc.type_fichier) ? (
 <FileText className="h-20 w-20 text-red-500" />
 ) : (
 <File className="h-20 w-20 text-gray-400" />
 )}
 <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
 <button
 onClick={() => onPreview(doc)}
 className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100"
 title="Prévisualiser"
 >
 <Eye className="h-5 w-5" />
 </button>
 <button
 onClick={() => onDownload(doc)}
 className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100"
 title="Télécharger"
 >
 <Download className="h-5 w-5" />
 </button>
 <button
 onClick={() => {
 if (confirm('Supprimer ce document ?')) {
 onDelete(doc.id);
 }
 }}
 className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
 title="Supprimer"
 >
 <Trash2 className="h-5 w-5" />
 </button>
 </div>
 </div>

 {/* Infos */}
 <div className="p-3">
 <h4 className="font-medium text-gray-900 truncate mb-1" title={doc.nom}>
 {doc.nom}
 </h4>
 <div className="space-y-1 text-xs text-gray-500">
 <div className="flex justify-between">
 <span>Version:</span>
 <span className="font-medium text-blue-600">{doc.version}</span>
 </div>
 <div className="flex justify-between">
 <span>Taille:</span>
 <span>{formatFileSize(doc.taille)}</span>
 </div>
 <div className="flex justify-between">
 <span>Uploadé par:</span>
 <span className="truncate max-w-[120px]" title={doc.uploade_par}>
 {doc.uploade_par}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Date:</span>
 <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8 text-gray-500">
 Aucun document dans cette catégorie
 </div>
 )}
 </div>
 );
}

interface PreviewModalProps {
 document: Document;
 onClose: () => void;
 onDownload: () => void;
}

function PreviewModal({ document: doc, onClose, onDownload }: PreviewModalProps) {
 const isImage = doc.type_fichier.startsWith('image/');
 const isPDF = doc.type_fichier === 'application/pdf';

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
 <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
 {/* Header */}
 <div className="flex justify-between items-center p-4 border-b">
 <div>
 <h3 className="font-semibold text-lg text-gray-900">{doc.nom}</h3>
 <p className="text-sm text-gray-500">Version {doc.version}</p>
 </div>
 <div className="flex gap-2">
 <button
 onClick={onDownload}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
 >
 <Download className="h-4 w-4" />
 Télécharger
 </button>
 <button
 onClick={onClose}
 className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
 >
 <X className="h-6 w-6" />
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-auto p-4">
 {isImage ? (
 <img src={doc.url} alt={doc.nom} className="max-w-full h-auto mx-auto" />
 ) : isPDF ? (
 <iframe src={doc.url} className="w-full h-[70vh] border-0" />
 ) : (
 <div className="flex flex-col items-center justify-center h-64">
 <File className="h-24 w-24 text-gray-400 mb-4" />
 <p className="text-gray-600">Aperçu non disponible pour ce type de fichier</p>
 <button
 onClick={onDownload}
 className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 Télécharger le fichier
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

// ============================================
// FICHIER 2: src/components/chantier/AvenantsTable.tsx
// ============================================

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type AvenantStatut = 'en_attente' | 'accepte' | 'refuse';

interface Avenant {
 id: string;
 chantier_id: string;
 numero: string;
 description: string;
 montant: number;
 date_avenant: string;
 statut: AvenantStatut;
 impact_planning: string | null;
 created_at: string;
 updated_at: string;
}

interface AvenantsTableProps {
 chantierId: string;
 budgetInitial: number;
}

export default function AvenantsTable({ chantierId, budgetInitial }: AvenantsTableProps) {
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [editingAvenant, setEditingAvenant] = useState<Avenant | null>(null);
 const queryClient = useQueryClient();

 const { data: avenants = [], isLoading } = useQuery({
 queryKey: ['avenants', chantierId],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('avenants')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('date_avenant', { ascending: false });

 if (error) throw error;
 return data as Avenant[];
 },
 });

 const deleteMutation = useMutation({
 mutationFn: async (id: string) => {
 const { error } = await supabase
 .from('avenants')
 .delete()
 .eq('id', id);

 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['avenants', chantierId] });
 },
 });

 const totalAvenantsAcceptes = avenants
 .filter(a => a.statut === 'accepte')
 .reduce((sum, a) => sum + a.montant, 0);

 const budgetActuel = budgetInitial + totalAvenantsAcceptes;
 const pourcentageImpact = ((totalAvenantsAcceptes / budgetInitial) * 100).toFixed(2);

 const getStatutBadge = (statut: AvenantStatut) => {
 const styles = {
 en_attente: 'bg-yellow-100 text-yellow-800',
 accepte: 'bg-green-100 text-green-800',
 refuse: 'bg-red-100 text-red-800',
 };
 const labels = {
 en_attente: 'En attente',
 accepte: 'Accepté',
 refuse: 'Refusé',
 };
 return (
 <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[statut]}`}>
 {labels[statut]}
 </span>
 );
 };

 const handleEdit = (avenant: Avenant) => {
 setEditingAvenant(avenant);
 setIsFormOpen(true);
 };

 const handleDelete = (id: string) => {
 if (confirm('Êtes-vous sûr de vouloir supprimer cet avenant ?')) {
 deleteMutation.mutate(id);
 }
 };

 return (
 <div className="space-y-6">
 {/* En-tête avec statistiques */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Budget Initial</div>
 <div className="text-2xl font-bold text-gray-900">
 {budgetInitial.toLocaleString('fr-FR')} €
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Total Avenants Acceptés</div>
 <div className={`text-2xl font-bold ${
 totalAvenantsAcceptes >= 0 ? 'text-green-600' : 'text-red-600'
 }`}>
 {totalAvenantsAcceptes >= 0 ? '+' : ''}{totalAvenantsAcceptes.toLocaleString('fr-FR')} €
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Budget Actuel</div>
 <div className="text-2xl font-bold text-blue-600">
 {budgetActuel.toLocaleString('fr-FR')} €
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Impact Budget</div>
 <div className={`text-2xl font-bold flex items-center gap-2 ${
 totalAvenantsAcceptes >= 0 ? 'text-green-600' : 'text-red-600'
 }`}>
 {totalAvenantsAcceptes >= 0 ? (
 <TrendingUp className="h-6 w-6" />
 ) : (
 <TrendingDown className="h-6 w-6" />
 )}
 {pourcentageImpact}%
 </div>
 </div>
 </div>

 {/* Header */}
 <div className="flex justify-between items-center">
 <h2 className="text-2xl font-bold text-gray-900">Avenants</h2>
 <button
 onClick={() => {
 setEditingAvenant(null);
 setIsFormOpen(true);
 }}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
 >
 <Plus className="h-5 w-5" />
 Nouvel Avenant
 </button>
 </div>

 {/* Tableau */}
 <div className="bg-white rounded-lg shadow overflow-hidden">
 {isLoading ? (
 <div className="flex justify-center items-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 ) : avenants.length === 0 ? (
 <div className="text-center py-12">
 <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
 <p className="text-gray-600">Aucun avenant enregistré</p>
 </div>
 ) : (
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 N°
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Description
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Montant
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Date
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Statut
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Impact Planning
 </th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {avenants.map((avenant) => (
 <tr key={avenant.id} className="hover:bg-gray-50">
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
 {avenant.numero}
 </td>
 <td className="px-6 py-4 text-sm text-gray-900">
 {avenant.description}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`text-sm font-semibold ${
 avenant.montant >= 0 ? 'text-green-600' : 'text-red-600'
 }`}>
 {avenant.montant >= 0 ? '+' : ''}{avenant.montant.toLocaleString('fr-FR')} €
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
 {format(new Date(avenant.date_avenant), 'dd/MM/yyyy', { locale: fr })}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 {getStatutBadge(avenant.statut)}
 </td>
 <td className="px-6 py-4 text-sm text-gray-600">
 {avenant.impact_planning || '-'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
 <button
 onClick={() => handleEdit(avenant)}
 className="text-blue-600 hover:text-blue-900 mr-3"
 title="Modifier"
 >
 <Edit2 className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDelete(avenant.id)}
 className="text-red-600 hover:text-red-900"
 title="Supprimer"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>

 {/* Formulaire Modal */}
 {isFormOpen && (
 <AvenantForm
 chantierId={chantierId}
 avenant={editingAvenant}
 onClose={() => {
 setIsFormOpen(false);
 setEditingAvenant(null);
 }}
 onSuccess={() => {
 queryClient.invalidateQueries({ queryKey: ['avenants', chantierId] });
 setIsFormOpen(false);
 setEditingAvenant(null);
 }}
 />
 )}
 </div>
 );
}

interface AvenantFormProps {
 chantierId: string;
 avenant: Avenant | null;
 onClose: () => void;
 onSuccess: () => void;
}

function AvenantForm({ chantierId, avenant, onClose, onSuccess }: AvenantFormProps) {
 const [formData, setFormData] = useState({
 numero: avenant?.numero || '',
 description: avenant?.description || '',
 montant: avenant?.montant || 0,
 date_avenant: avenant?.date_avenant || new Date().toISOString().split('T')[0],
 statut: avenant?.statut || 'en_attente' as AvenantStatut,
 impact_planning: avenant?.impact_planning || '',
 });

 const mutation = useMutation({
 mutationFn: async () => {
 if (avenant) {
 const { error } = await supabase
 .from('avenants')
 .update(formData)
 .eq('id', avenant.id);
 if (error) throw error;
 } else {
 const { error } = await supabase
 .from('avenants')
 .insert({ ...formData, chantier_id: chantierId });
 if (error) throw error;
 }
 },
 onSuccess,
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 mutation.mutate();
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
 <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className="p-6">
 <h3 className="text-xl font-bold text-gray-900 mb-6">
 {avenant ? 'Modifier l\'avenant' : 'Nouvel avenant'}
 </h3>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Numéro *
 </label>
 <input
 type="text"
 required
 value={formData.numero}
 onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="AV-001"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date *
 </label>
 <input
 type="date"
 required
 value={formData.date_avenant}
 onChange={(e) => setFormData({ ...formData, date_avenant: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Description *
 </label>
 <textarea
 required
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Description de l'avenant..."
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Montant (€) *
 </label>
 <input
 type="number"
 required
 step="0.01"
 value={formData.montant}
 onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Positif ou négatif"
 />
 <p className="text-xs text-gray-500 mt-1">
 Montant positif pour augmentation, négatif pour réduction
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Statut *
 </label>
 <select
 value={formData.statut}
 onChange={(e) => setFormData({ ...formData, statut: e.target.value as AvenantStatut })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="en_attente">En attente</option>
 <option value="accepte">Accepté</option>
 <option value="refuse">Refusé</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Impact sur le planning
 </label>
 <input
 type="text"
 value={formData.impact_planning}
 onChange={(e) => setFormData({ ...formData, impact_planning: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Ex: +15 jours, Report livraison au 15/06..."
 />
 </div>

 <div className="flex justify-end gap-3 pt-4">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
 >
 Annuler
 </button>
 <button
 type="submit"
 disabled={mutation.isPending}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
 >
 {mutation.isPending ? 'Enregistrement...' : avenant ? 'Modifier' : 'Créer'}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
}

// ============================================
// FICHIER 3: src/components/chantier/CommandesTable.tsx
// ============================================

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Filter, AlertTriangle, Package } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

type CommandeStatut = 'en_attente' | 'commandee' | 'livree' | 'litige';

interface Commande {
 id: string;
 chantier_id: string;
 fournisseur: string;
 description: string;
 montant: number;
 date_commande: string;
 date_livraison_prevue: string;
 date_livraison_reelle: string | null;
 statut: CommandeStatut;
 numero_commande: string;
 contact_fournisseur: string | null;
 notes: string | null;
 created_at: string;
 updated_at: string;
}

interface CommandesTableProps {
 chantierId: string;
}

export default function CommandesTable({ chantierId }: CommandesTableProps) {
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [editingCommande, setEditingCommande] = useState<Commande | null>(null);
 const [filterStatut, setFilterStatut] = useState<CommandeStatut | 'all'>('all');
 const queryClient = useQueryClient();

 const { data: commandes = [], isLoading } = useQuery({
 queryKey: ['commandes', chantierId],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('commandes')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('date_commande', { ascending: false });

 if (error) throw error;
 return data as Commande[];
 },
 });

 const deleteMutation = useMutation({
 mutationFn: async (id: string) => {
 const { error } = await supabase
 .from('commandes')
 .delete()
 .eq('id', id);

 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['commandes', chantierId] });
 },
 });

 const filteredCommandes = filterStatut === 'all'
 ? commandes
 : commandes.filter(c => c.statut === filterStatut);

 const commandesEnRetard = commandes.filter(c => {
 if (c.statut === 'livree' || !c.date_livraison_prevue) return false;
 return new Date(c.date_livraison_prevue) < new Date();
 });

 const getStatutBadge = (statut: CommandeStatut) => {
 const styles = {
 en_attente: 'bg-gray-100 text-gray-800',
 commandee: 'bg-blue-100 text-blue-800',
 livree: 'bg-green-100 text-green-800',
 litige: 'bg-red-100 text-red-800',
 };
 const labels = {
 en_attente: 'En attente',
 commandee: 'Commandée',
 livree: 'Livrée',
 litige: 'Litige',
 };
 return (
 <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[statut]}`}>
 {labels[statut]}
 </span>
 );
 };

 const isRetard = (commande: Commande) => {
 if (commande.statut === 'livree' || !commande.date_livraison_prevue) return false;
 return new Date(commande.date_livraison_prevue) < new Date();
 };

 const getRetardJours = (commande: Commande) => {
 if (!isRetard(commande)) return 0;
 return differenceInDays(new Date(), new Date(commande.date_livraison_prevue));
 };

 const handleEdit = (commande: Commande) => {
 setEditingCommande(commande);
 setIsFormOpen(true);
 };

 const handleDelete = (id: string) => {
 if (confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
 deleteMutation.mutate(id);
 }
 };

 const totalCommandes = commandes.reduce((sum, c) => sum + c.montant, 0);

 return (
 <div className="space-y-6">
 {/* Statistiques */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Total Commandes</div>
 <div className="text-2xl font-bold text-gray-900">
 {commandes.length}
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Montant Total</div>
 <div className="text-2xl font-bold text-blue-600">
 {totalCommandes.toLocaleString('fr-FR')} €
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">En Retard</div>
 <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
 <AlertTriangle className="h-6 w-6" />
 {commandesEnRetard.length}
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Livrées</div>
 <div className="text-2xl font-bold text-green-600">
 {commandes.filter(c => c.statut === 'livree').length}
 </div>
 </div>
 </div>

 {/* Header avec filtres */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <h2 className="text-2xl font-bold text-gray-900">Commandes</h2>
 <div className="flex gap-3">
 <div className="flex items-center gap-2">
 <Filter className="h-5 w-5 text-gray-500" />
 <select
 value={filterStatut}
 onChange={(e) => setFilterStatut(e.target.value as CommandeStatut | 'all')}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="all">Tous les statuts</option>
 <option value="en_attente">En attente</option>
 <option value="commandee">Commandée</option>
 <option value="livree">Livrée</option>
 <option value="litige">Litige</option>
 </select>
 </div>
 <button
 onClick={() => {
 setEditingCommande(null);
 setIsFormOpen(true);
 }}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
 >
 <Plus className="h-5 w-5" />
 Nouvelle Commande
 </button>
 </div>
 </div>

 {/* Alertes retards */}
 {commandesEnRetard.length > 0 && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-4">
 <div className="flex items-center gap-2 mb-2">
 <AlertTriangle className="h-5 w-5 text-red-600" />
 <h3 className="font-semibold text-red-900">
 {commandesEnRetard.length} commande(s) en retard
 </h3>
 </div>
 <ul className="space-y-1 text-sm text-red-800">
 {commandesEnRetard.slice(0, 3).map(c => (
 <li key={c.id}>
 • {c.fournisseur} - {c.description} (retard: {getRetardJours(c)} jours)
 </li>
 ))}
 {commandesEnRetard.length > 3 && (
 <li>• ... et {commandesEnRetard.length - 3} autre(s)</li>
 )}
 </ul>
 </div>
 )}

 {/* Tableau */}
 <div className="bg-white rounded-lg shadow overflow-hidden">
 {isLoading ? (
 <div className="flex justify-center items-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 ) : filteredCommandes.length === 0 ? (
 <div className="text-center py-12">
 <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
 <p className="text-gray-600">
 {filterStatut === 'all'
 ? 'Aucune commande enregistrée'
 : 'Aucune commande avec ce statut'}
 </p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 N° Commande
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Fournisseur
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Description
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Montant
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Date Commande
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Livraison Prévue
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Livraison Réelle
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Statut
 </th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {filteredCommandes.map((commande) => (
 <tr
 key={commande.id}
 className={`hover:bg-gray-50 ${
 isRetard(commande) ? 'bg-red-50' : ''
 }`}
 >
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
 {commande.numero_commande}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 <div>
 <div className="font-medium">{commande.fournisseur}</div>
 {commande.contact_fournisseur && (
 <div className="text-xs text-gray-500">
 {commande.contact_fournisseur}
 </div>
 )}
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-gray-900">
 {commande.description}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
 {commande.montant.toLocaleString('fr-FR')} €
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
 {format(new Date(commande.date_commande), 'dd/MM/yyyy', { locale: fr })}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm">
 <div className="flex items-center gap-2">
 <span className={isRetard(commande) ? 'text-red-600 font-medium' : 'text-gray-600'}>
 {format(new Date(commande.date_livraison_prevue), 'dd/MM/yyyy', { locale: fr })}
 </span>
 {isRetard(commande) && (
 <AlertTriangle className="h-4 w-4 text-red-600" title={`Retard: ${getRetardJours(commande)} jours`} />
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
 {commande.date_livraison_reelle
 ? format(new Date(commande.date_livraison_reelle), 'dd/MM/yyyy', { locale: fr })
 : '-'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 {getStatutBadge(commande.statut)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
 <button
 onClick={() => handleEdit(commande)}
 className="text-blue-600 hover:text-blue-900 mr-3"
 title="Modifier"
 >
 <Edit2 className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDelete(commande.id)}
 className="text-red-600 hover:text-red-900"
 title="Supprimer"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Formulaire Modal */}
 {isFormOpen && (
 <CommandeForm
 chantierId={chantierId}
 commande={editingCommande}
 onClose={() => {
 setIsFormOpen(false);
 setEditingCommande(null);
 }}
 onSuccess={() => {
 queryClient.invalidateQueries({ queryKey: ['commandes', chantierId] });
 setIsFormOpen(false);
 setEditingCommande(null);
 }}
 />
 )}
 </div>
 );
}

interface CommandeFormProps {
 chantierId: string;
 commande: Commande | null;
 onClose: () => void;
 onSuccess: () => void;
}

function CommandeForm({ chantierId, commande, onClose, onSuccess }: CommandeFormProps) {
 const [formData, setFormData] = useState({
 numero_commande: commande?.numero_commande || '',
 fournisseur: commande?.fournisseur || '',
 contact_fournisseur: commande?.contact_fournisseur || '',
 description: commande?.description || '',
 montant: commande?.montant || 0,
 date_commande: commande?.date_commande || new Date().toISOString().split('T')[0],
 date_livraison_prevue: commande?.date_livraison_prevue || '',
 date_livraison_reelle: commande?.date_livraison_reelle || '',
 statut: commande?.statut || 'en_attente' as CommandeStatut,
 notes: commande?.notes || '',
 });

 const mutation = useMutation({
 mutationFn: async () => {
 const data = {
 ...formData,
 date_livraison_reelle: formData.date_livraison_reelle || null,
 contact_fournisseur: formData.contact_fournisseur || null,
 notes: formData.notes || null,
 };

 if (commande) {
 const { error } = await supabase
 .from('commandes')
 .update(data)
 .eq('id', commande.id);
 if (error) throw error;
 } else {
 const { error } = await supabase
 .from('commandes')
 .insert({ ...data, chantier_id: chantierId });
 if (error) throw error;
 }
 },
 onSuccess,
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 mutation.mutate();
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
 <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
 <div className="p-6">
 <h3 className="text-xl font-bold text-gray-900 mb-6">
 {commande ? 'Modifier la commande' : 'Nouvelle commande'}
 </h3>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 N° Commande *
 </label>
 <input
 type="text"
 required
 value={formData.numero_commande}
 onChange={(e) => setFormData({ ...formData, numero_commande: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="CMD-001"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Fournisseur *
 </label>
 <input
 type="text"
 required
 value={formData.fournisseur}
 onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Nom du fournisseur"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Contact Fournisseur
 </label>
 <input
 type="text"
 value={formData.contact_fournisseur}
 onChange={(e) => setFormData({ ...formData, contact_fournisseur: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Email ou téléphone"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Description *
 </label>
 <textarea
 required
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Description de la commande..."
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Montant (€) *
 </label>
 <input
 type="number"
 required
 step="0.01"
 min="0"
 value={formData.montant}
 onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Statut *
 </label>
 <select
 value={formData.statut}
 onChange={(e) => setFormData({ ...formData, statut: e.target.value as CommandeStatut })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="en_attente">En attente</option>
 <option value="commandee">Commandée</option>
 <option value="livree">Livrée</option>
 <option value="litige">Litige</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date Commande *
 </label>
 <input
 type="date"
 required
 value={formData.date_commande}
 onChange={(e) => setFormData({ ...formData, date_commande: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Livraison Prévue *
 </label>
 <input
 type="date"
 required
 value={formData.date_livraison_prevue}
 onChange={(e) => setFormData({ ...formData, date_livraison_prevue: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Livraison Réelle
 </label>
 <input
 type="date"
 value={formData.date_livraison_reelle}
 onChange={(e) => setFormData({ ...formData, date_livraison_reelle: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Notes
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={2}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Notes additionnelles..."
 />
 </div>

 <div className="flex justify-end gap-3 pt-4">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
 >
 Annuler
 </button>
 <button
 type="submit"
 disabled={mutation.isPending}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
 >
 {mutation.isPending ? 'Enregistrement...' : commande ? 'Modifier' : 'Créer'}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
}

// ============================================
// FICHIER 4: src/components/chantier/SousTraitanceTab.tsx
// ============================================

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type SousTraitantStatut = 'prevu' | 'en_cours' | 'termine' | 'suspendu';

interface SousTraitant {
 id: string;
 chantier_id: string;
 nom: string;
 metier: string;
 numero_contrat: string;
 declaration_st: boolean;
 date_declaration: string | null;
 montant_contrat: number;
 avancement: number;
 statut: SousTraitantStatut;
 heures_insertion_prevues: number;
 heures_insertion_realisees: number;
 contact: string | null;
 email: string | null;
 telephone: string | null;
 date_debut: string;
 date_fin_prevue: string;
 date_fin_reelle: string | null;
 notes: string | null;
 created_at: string;
 updated_at: string;
}

interface SousTraitanceTabProps {
 chantierId: string;
}

export default function SousTraitanceTab({ chantierId }: SousTraitanceTabProps) {
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [editingSousTraitant, setEditingSousTraitant] = useState<SousTraitant | null>(null);
 const queryClient = useQueryClient();

 const { data: sousTraitants = [], isLoading } = useQuery({
 queryKey: ['sous_traitants', chantierId],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('sous_traitants')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('date_debut', { ascending: false });

 if (error) throw error;
 return data as SousTraitant[];
 },
 });

 const deleteMutation = useMutation({
 mutationFn: async (id: string) => {
 const { error } = await supabase
 .from('sous_traitants')
 .delete()
 .eq('id', id);

 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['sous_traitants', chantierId] });
 },
 });

 const totalMontant = sousTraitants.reduce((sum, st) => sum + st.montant_contrat, 0);
 const totalHeuresInsertionPrevues = sousTraitants.reduce((sum, st) => sum + st.heures_insertion_prevues, 0);
 const totalHeuresInsertionRealisees = sousTraitants.reduce((sum, st) => sum + st.heures_insertion_realisees, 0);
 const tauxRealisationInsertion = totalHeuresInsertionPrevues > 0
 ? ((totalHeuresInsertionRealisees / totalHeuresInsertionPrevues) * 100).toFixed(1)
 : '0';

 const sansDeclaration = sousTraitants.filter(st => !st.declaration_st);

 const getStatutBadge = (statut: SousTraitantStatut) => {
 const styles = {
 prevu: 'bg-gray-100 text-gray-800',
 en_cours: 'bg-blue-100 text-blue-800',
 termine: 'bg-green-100 text-green-800',
 suspendu: 'bg-red-100 text-red-800',
 };
 const labels = {
 prevu: 'Prévu',
 en_cours: 'En cours',
 termine: 'Terminé',
 suspendu: 'Suspendu',
 };
 return (
 <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[statut]}`}>
 {labels[statut]}
 </span>
 );
 };

 const handleEdit = (sousTraitant: SousTraitant) => {
 setEditingSousTraitant(sousTraitant);
 setIsFormOpen(true);
 };

 const handleDelete = (id: string) => {
 if (confirm('Êtes-vous sûr de vouloir supprimer ce sous-traitant ?')) {
 deleteMutation.mutate(id);
 }
 };

 return (
 <div className="space-y-6">
 {/* Statistiques */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Sous-Traitants</div>
 <div className="text-2xl font-bold text-gray-900">
 {sousTraitants.length}
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Montant Total Contrats</div>
 <div className="text-2xl font-bold text-blue-600">
 {totalMontant.toLocaleString('fr-FR')} €
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Heures Insertion</div>
 <div className="text-2xl font-bold text-green-600">
 {totalHeuresInsertionRealisees}h / {totalHeuresInsertionPrevues}h
 </div>
 <div className="text-xs text-gray-500 mt-1">
 Taux: {tauxRealisationInsertion}%
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Sans Déclaration ST</div>
 <div className={`text-2xl font-bold flex items-center gap-2 ${
 sansDeclaration.length > 0 ? 'text-red-600' : 'text-green-600'
 }`}>
 {sansDeclaration.length > 0 ? (
 <AlertCircle className="h-6 w-6" />
 ) : (
 <CheckCircle2 className="h-6 w-6" />
 )}
 {sansDeclaration.length}
 </div>
 </div>
 </div>

 {/* Alertes */}
 {sansDeclaration.length > 0 && (
 <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
 <div className="flex items-center gap-2 mb-2">
 <AlertCircle className="h-5 w-5 text-orange-600" />
 <h3 className="font-semibold text-orange-900">
 {sansDeclaration.length} sous-traitant(s) sans déclaration ST
 </h3>
 </div>
 <ul className="space-y-1 text-sm text-orange-800">
 {sansDeclaration.map(st => (
 <li key={st.id}>• {st.nom} - {st.metier}</li>
 ))}
 </ul>
 </div>
 )}

 {/* Header */}
 <div className="flex justify-between items-center">
 <h2 className="text-2xl font-bold text-gray-900">Sous-Traitance</h2>
 <button
 onClick={() => {
 setEditingSousTraitant(null);
 setIsFormOpen(true);
 }}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
 >
 <Plus className="h-5 w-5" />
 Nouveau Sous-Traitant
 </button>
 </div>

 {/* Tableau */}
 <div className="bg-white rounded-lg shadow overflow-hidden">
 {isLoading ? (
 <div className="flex justify-center items-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 ) : sousTraitants.length === 0 ? (
 <div className="text-center py-12">
 <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
 <p className="text-gray-600">Aucun sous-traitant enregistré</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Nom / Contact
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Métier
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Contrat
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Déclaration ST
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Montant
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Avancement
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Heures Insertion
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Statut
 </th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {sousTraitants.map((st) => (
 <tr key={st.id} className="hover:bg-gray-50">
 <td className="px-6 py-4 text-sm">
 <div>
 <div className="font-medium text-gray-900">{st.nom}</div>
 {st.contact && (
 <div className="text-xs text-gray-500">{st.contact}</div>
 )}
 {st.telephone && (
 <div className="text-xs text-gray-500">{st.telephone}</div>
 )}
 {st.email && (
 <div className="text-xs text-gray-500">{st.email}</div>
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {st.metier}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm">
 <div>
 <div className="font-medium text-gray-900">{st.numero_contrat}</div>
 <div className="text-xs text-gray-500">
 {format(new Date(st.date_debut), 'dd/MM/yyyy', { locale: fr })}
 </div>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm">
 {st.declaration_st ? (
 <div className="flex items-center gap-1 text-green-600">
 <CheckCircle2 className="h-4 w-4" />
 <span>Oui</span>
 {st.date_declaration && (
 <span className="text-xs text-gray-500">
 ({format(new Date(st.date_declaration), 'dd/MM/yy', { locale: fr })})
 </span>
 )}
 </div>
 ) : (
 <div className="flex items-center gap-1 text-red-600">
 <AlertCircle className="h-4 w-4" />
 <span>Non</span>
 </div>
 )}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
 {st.montant_contrat.toLocaleString('fr-FR')} €
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center gap-2">
 <div className="flex-1">
 <div className="w-24 bg-gray-200 rounded-full h-2">
 <div
 className="bg-blue-600 h-2 rounded-full"
 style={{ width: `${st.avancement}%` }}
 ></div>
 </div>
 </div>
 <span className="text-sm font-medium text-gray-900">
 {st.avancement}%
 </span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center gap-1 text-sm">
 <Clock className="h-4 w-4 text-gray-400" />
 <span className={`font-medium ${
 st.heures_insertion_realisees >= st.heures_insertion_prevues
 ? 'text-green-600'
 : 'text-gray-900'
 }`}>
 {st.heures_insertion_realisees}h
 </span>
 <span className="text-gray-500">/ {st.heures_insertion_prevues}h</span>
 </div>
 <div className="text-xs text-gray-500 mt-1">
 {st.heures_insertion_prevues > 0
 ? `${((st.heures_insertion_realisees / st.heures_insertion_prevues) * 100).toFixed(0)}%`
 : '0%'}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 {getStatutBadge(st.statut)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
 <button
 onClick={() => handleEdit(st)}
 className="text-blue-600 hover:text-blue-900 mr-3"
 title="Modifier"
 >
 <Edit2 className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDelete(st.id)}
 className="text-red-600 hover:text-red-900"
 title="Supprimer"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Formulaire Modal */}
 {isFormOpen && (
 <SousTraitantForm
 chantierId={chantierId}
 sousTraitant={editingSousTraitant}
 onClose={() => {
 setIsFormOpen(false);
 setEditingSousTraitant(null);
 }}
 onSuccess={() => {
 queryClient.invalidateQueries({ queryKey: ['sous_traitants', chantierId] });
 setIsFormOpen(false);
 setEditingSousTraitant(null);
 }}
 />
 )}
 </div>
 );
}

interface SousTraitantFormProps {
 chantierId: string;
 sousTraitant: SousTraitant | null;
 onClose: () => void;
 onSuccess: () => void;
}

function SousTraitantForm({ chantierId, sousTraitant, onClose, onSuccess }: SousTraitantFormProps) {
 const [formData, setFormData] = useState({
 nom: sousTraitant?.nom || '',
 metier: sousTraitant?.metier || '',
 numero_contrat: sousTraitant?.numero_contrat || '',
 declaration_st: sousTraitant?.declaration_st || false,
 date_declaration: sousTraitant?.date_declaration || '',
 montant_contrat: sousTraitant?.montant_contrat || 0,
 avancement: sousTraitant?.avancement || 0,
 statut: sousTraitant?.statut || 'prevu' as SousTraitantStatut,
 heures_insertion_prevues: sousTraitant?.heures_insertion_prevues || 0,
 heures_insertion_realisees: sousTraitant?.heures_insertion_realisees || 0,
 contact: sousTraitant?.contact || '',
 email: sousTraitant?.email || '',
 telephone: sousTraitant?.telephone || '',
 date_debut: sousTraitant?.date_debut || new Date().toISOString().split('T')[0],
 date_fin_prevue: sousTraitant?.date_fin_prevue || '',
 date_fin_reelle: sousTraitant?.date_fin_reelle || '',
 notes: sousTraitant?.notes || '',
 });

 const mutation = useMutation({
 mutationFn: async () => {
 const data = {
 ...formData,
 date_declaration: formData.date_declaration || null,
 date_fin_reelle: formData.date_fin_reelle || null,
 contact: formData.contact || null,
 email: formData.email || null,
 telephone: formData.telephone || null,
 notes: formData.notes || null,
 };

 if (sousTraitant) {
 const { error } = await supabase
 .from('sous_traitants')
 .update(data)
 .eq('id', sousTraitant.id);
 if (error) throw error;
 } else {
 const { error } = await supabase
 .from('sous_traitants')
 .insert({ ...data, chantier_id: chantierId });
 if (error) throw error;
 }
 },
 onSuccess,
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 mutation.mutate();
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
 <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
 <div className="p-6">
 <h3 className="text-xl font-bold text-gray-900 mb-6">
 {sousTraitant ? 'Modifier le sous-traitant' : 'Nouveau sous-traitant'}
 </h3>

 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Informations générales */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-3">Informations générales</h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Nom *
 </label>
 <input
 type="text"
 required
 value={formData.nom}
 onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Nom de l'entreprise"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Métier *
 </label>
 <input
 type="text"
 required
 value={formData.metier}
 onChange={(e) => setFormData({ ...formData, metier: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Ex: Plomberie, Électricité..."
 />
 </div>
 </div>
 </div>

 {/* Contrat */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-3">Contrat</h4>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 N° Contrat *
 </label>
 <input
 type="text"
 required
 value={formData.numero_contrat}
 onChange={(e) => setFormData({ ...formData, numero_contrat: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="ST-001"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Montant Contrat (€) *
 </label>
 <input
 type="number"
 required
 step="0.01"
 min="0"
 value={formData.montant_contrat}
 onChange={(e) => setFormData({ ...formData, montant_contrat: parseFloat(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Statut *
 </label>
 <select
 value={formData.statut}
 onChange={(e) => setFormData({ ...formData, statut: e.target.value as SousTraitantStatut })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="prevu">Prévu</option>
 <option value="en_cours">En cours</option>
 <option value="termine">Terminé</option>
 <option value="suspendu">Suspendu</option>
 </select>
 </div>
 </div>
 </div>

 {/* Déclaration ST */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-3">Déclaration Sous-Traitance</h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={formData.declaration_st}
 onChange={(e) => setFormData({ ...formData, declaration_st: e.target.checked })}
 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
 />
 <span className="text-sm font-medium text-gray-700">
 Déclaration ST effectuée
 </span>
 </label>
 </div>

 {formData.declaration_st && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date Déclaration
 </label>
 <input
 type="date"
 value={formData.date_declaration}
 onChange={(e) => setFormData({ ...formData, date_declaration: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 )}
 </div>
 </div>

 {/* Dates */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-3">Planning</h4>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date Début *
 </label>
 <input
 type="date"
 required
 value={formData.date_debut}
 onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date Fin Prévue *
 </label>
 <input
 type="date"
 required
 value={formData.date_fin_prevue}
 onChange={(e) => setFormData({ ...formData, date_fin_prevue: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date Fin Réelle
 </label>
 <input
 type="date"
 value={formData.date_fin_reelle}
 onChange={(e) => setFormData({ ...formData, date_fin_reelle: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 </div>
 </div>

 {/* Avancement et Heures Insertion */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-3">Avancement et Heures Insertion</h4>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Avancement (%) *
 </label>
 <input
 type="number"
 required
 min="0"
 max="100"
 value={formData.avancement}
 onChange={(e) => setFormData({ ...formData, avancement: parseInt(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Heures Insertion Prévues *
 </label>
 <input
 type="number"
 required
 min="0"
 value={formData.heures_insertion_prevues}
 onChange={(e) => setFormData({ ...formData, heures_insertion_prevues: parseInt(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Heures Insertion Réalisées *
 </label>
 <input
 type="number"
 required
 min="0"
 value={formData.heures_insertion_realisees}
 onChange={(e) => setFormData({ ...formData, heures_insertion_realisees: parseInt(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 </div>
 </div>

 {/* Contacts */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-3">Contacts</h4>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Contact
 </label>
 <input
 type="text"
 value={formData.contact}
 onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Nom du contact"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Email
 </label>
 <input
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="email@exemple.com"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Téléphone
 </label>
 <input
 type="tel"
 value={formData.telephone}
 onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="06 12 34 56 78"
 />
 </div>
 </div>
 </div>

 {/* Notes */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Notes
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Notes additionnelles..."
 />
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
 >
 Annuler
 </button>
 <button
 type="submit"
 disabled={mutation.isPending}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
 >
 {mutation.isPending ? 'Enregistrement...' : sousTraitant ? 'Modifier' : 'Créer'}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
}