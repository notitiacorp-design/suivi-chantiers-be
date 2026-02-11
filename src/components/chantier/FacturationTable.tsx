import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Filter, Download, X, Calendar, DollarSign, AlertCircle, Check } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FacturationTableProps {
 chantierId: string;
}

interface Facture {
 id: string;
 numero: string;
 date_emission: string;
 montant_ht: number;
 tva: number;
 montant_ttc: number;
 date_echeance: string;
 statut: 'emise' | 'payee' | 'en_retard' | 'avoir';
 description?: string;
 date_paiement?: string;
}

type StatutFacture = 'tous' | 'emise' | 'payee' | 'en_retard' | 'avoir';

const FacturationTable: React.FC<FacturationTableProps> = ({ chantierId }) => {
 const queryClient = useQueryClient();
 const [showForm, setShowForm] = useState(false);
 const [filtreStatut, setFiltreStatut] = useState<StatutFacture>('tous');
 const [formData, setFormData] = useState({
 numero: '',
 date_emission: format(new Date(), 'yyyy-MM-dd'),
 montant_ht: '',
 tva: '20',
 date_echeance: '',
 description: '',
 statut: 'emise' as const
 });

 // Récupérer les factures
 const { data: factures = [], isLoading } = useQuery<Facture[]>({
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

 // Mutation ajout facture
 const addFactureMutation = useMutation({
 mutationFn: async (newFacture: any) => {
 const montantHT = parseFloat(newFacture.montant_ht);
 const tauxTVA = parseFloat(newFacture.tva) / 100;
 const montantTTC = montantHT * (1 + tauxTVA);

 const { data, error } = await supabase
 .from('factures')
 .insert([{
 chantier_id: chantierId,
 numero: newFacture.numero,
 date_emission: newFacture.date_emission,
 montant_ht: montantHT,
 tva: parseFloat(newFacture.tva),
 montant_ttc: montantTTC,
 date_echeance: newFacture.date_echeance,
 statut: newFacture.statut,
 description: newFacture.description
 }])
 .select()
 .single();

 if (error) throw error;
 return data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['factures', chantierId] });
 setShowForm(false);
 setFormData({
 numero: '',
 date_emission: format(new Date(), 'yyyy-MM-dd'),
 montant_ht: '',
 tva: '20',
 date_echeance: '',
 description: '',
 statut: 'emise'
 });
 }
 });

 // Mutation changement statut
 const updateStatutMutation = useMutation({
 mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
 const updates: any = { statut };
 if (statut === 'payee') {
 updates.date_paiement = format(new Date(), 'yyyy-MM-dd');
 }

 const { error } = await supabase
 .from('factures')
 .update(updates)
 .eq('id', id);

 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['factures', chantierId] });
 }
 });

 // Filtrer les factures
 const facturesFiltrees = useMemo(() => {
 let filtered = factures;

 if (filtreStatut !== 'tous') {
 filtered = filtered.filter(f => f.statut === filtreStatut);
 }

 return filtered;
 }, [factures, filtreStatut]);

 // Calculer les totaux
 const totaux = useMemo(() => {
 const totalHT = facturesFiltrees
 .filter(f => f.statut !== 'avoir')
 .reduce((sum, f) => sum + f.montant_ht, 0);
 
 const totalAvoir = facturesFiltrees
 .filter(f => f.statut === 'avoir')
 .reduce((sum, f) => sum + Math.abs(f.montant_ht), 0);
 
 const totalTVA = facturesFiltrees
 .filter(f => f.statut !== 'avoir')
 .reduce((sum, f) => sum + (f.montant_ht * f.tva / 100), 0);
 
 const totalTTC = facturesFiltrees
 .filter(f => f.statut !== 'avoir')
 .reduce((sum, f) => sum + f.montant_ttc, 0);

 return {
 totalHT: totalHT - totalAvoir,
 totalTVA,
 totalTTC: totalTTC - (totalAvoir * 1.2),
 totalAvoir
 };
 }, [facturesFiltrees]);

 const formatEuro = (value: number) => {
 return new Intl.NumberFormat('fr-FR', {
 style: 'currency',
 currency: 'EUR',
 minimumFractionDigits: 2
 }).format(value);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 addFactureMutation.mutate(formData);
 };

 const getStatutBadge = (facture: Facture) => {
 const isEnRetard = facture.statut === 'emise' && isPast(parseISO(facture.date_echeance));
 
 if (isEnRetard) {
 return (
 <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
 <AlertCircle className="w-3 h-3" />
 En retard
 </span>
 );
 }

 const badges = {
 emise: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Émise</span>,
 payee: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><Check className="w-3 h-3" />Payée</span>,
 en_retard: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3" />En retard</span>,
 avoir: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Avoir</span>
 };

 return badges[facture.statut];
 };

 const exportCSV = () => {
 const headers = ['Numéro', 'Date Émission', 'Montant HT', 'TVA', 'Montant TTC', 'Échéance', 'Statut'];
 const rows = facturesFiltrees.map(f => [
 f.numero,
 format(parseISO(f.date_emission), 'dd/MM/yyyy'),
 f.montant_ht.toFixed(2),
 f.tva + '%',
 f.montant_ttc.toFixed(2),
 format(parseISO(f.date_echeance), 'dd/MM/yyyy'),
 f.statut
 ]);

 const csv = [
 headers.join(';'),
 ...rows.map(row => row.join(';'))
 ].join('\n');

 const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 link.href = URL.createObjectURL(blob);
 link.download = `factures_${chantierId}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
 link.click();
 };

 return (
 <div className="space-y-4">
 {/* En-tête */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div className="flex items-center gap-2">
 <Filter className="w-5 h-5 text-gray-400" />
 <select
 value={filtreStatut}
 onChange={(e) => setFiltreStatut(e.target.value as StatutFacture)}
 className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="tous">Tous les statuts</option>
 <option value="emise">Émises</option>
 <option value="payee">Payées</option>
 <option value="en_retard">En retard</option>
 <option value="avoir">Avoirs</option>
 </select>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={exportCSV}
 className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
 >
 <Download className="w-4 h-4" />
 Exporter CSV
 </button>
 <button
 onClick={() => setShowForm(true)}
 className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
 >
 <Plus className="w-4 h-4" />
 Nouvelle Facture
 </button>
 </div>
 </div>

 {/* Formulaire ajout facture */}
 {showForm && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h3 className="text-lg font-semibold text-gray-900">Nouvelle Facture</h3>
 <button
 onClick={() => setShowForm(false)}
 className="text-gray-400 hover:text-gray-600"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Numéro de facture *
 </label>
 <input
 type="text"
 required
 value={formData.numero}
 onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder="FAC-2024-001"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date d'émission *
 </label>
 <input
 type="date"
 required
 value={formData.date_emission}
 onChange={(e) => setFormData({ ...formData, date_emission: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Montant HT (€) *
 </label>
 <input
 type="number"
 required
 step="0.01"
 min="0"
 value={formData.montant_ht}
 onChange={(e) => setFormData({ ...formData, montant_ht: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder="10000.00"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 TVA (%) *
 </label>
 <select
 value={formData.tva}
 onChange={(e) => setFormData({ ...formData, tva: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="0">0%</option>
 <option value="5.5">5.5%</option>
 <option value="10">10%</option>
 <option value="20">20%</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date d'échéance *
 </label>
 <input
 type="date"
 required
 value={formData.date_echeance}
 onChange={(e) => setFormData({ ...formData, date_echeance: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Statut
 </label>
 <select
 value={formData.statut}
 onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="emise">Émise</option>
 <option value="payee">Payée</option>
 <option value="avoir">Avoir</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Description
 </label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder="Description de la facture..."
 />
 </div>

 {formData.montant_ht && (
 <div className="bg-gray-50 rounded-lg p-4 space-y-2">
 <div className="flex justify-between text-sm">
 <span className="text-gray-600">Montant HT:</span>
 <span className="font-medium">{formatEuro(parseFloat(formData.montant_ht || '0'))}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-gray-600">TVA ({formData.tva}%):</span>
 <span className="font-medium">
 {formatEuro(parseFloat(formData.montant_ht || '0') * parseFloat(formData.tva) / 100)}
 </span>
 </div>
 <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
 <span>Montant TTC:</span>
 <span>
 {formatEuro(parseFloat(formData.montant_ht || '0') * (1 + parseFloat(formData.tva) / 100))}
 </span>
 </div>
 </div>
 )}

 <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
 <button
 type="button"
 onClick={() => setShowForm(false)}
 className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
 >
 Annuler
 </button>
 <button
 type="submit"
 disabled={addFactureMutation.isPending}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
 >
 {addFactureMutation.isPending ? 'Création...' : 'Créer la facture'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Tableau */}
 <div className="bg-white rounded-lg shadow overflow-hidden">
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Facture</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Émission</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant HT</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">TVA</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant TTC</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Échéance</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {isLoading ? (
 <tr>
 <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
 Chargement...
 </td>
 </tr>
 ) : facturesFiltrees.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
 Aucune facture trouvée
 </td>
 </tr>
 ) : (
 facturesFiltrees.map((facture) => {
 const isEnRetard = facture.statut === 'emise' && isPast(parseISO(facture.date_echeance));
 return (
 <tr
 key={facture.id}
 className={`hover:bg-gray-50 ${isEnRetard ? 'bg-red-50' : ''}`}
 >
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
 {facture.numero}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
 {format(parseISO(facture.date_emission), 'dd/MM/yyyy', { locale: fr })}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
 {formatEuro(facture.montant_ht)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
 {facture.tva}%
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
 {formatEuro(facture.montant_ttc)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
 <div className="flex items-center gap-1">
 <Calendar className="w-4 h-4" />
 {format(parseISO(facture.date_echeance), 'dd/MM/yyyy', { locale: fr })}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 {getStatutBadge(facture)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm">
 {facture.statut === 'emise' && (
 <button
 onClick={() => updateStatutMutation.mutate({ id: facture.id, statut: 'payee' })}
 className="text-green-600 hover:text-green-800 font-medium"
 >
 Marquer payée
 </button>
 )}
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 {facturesFiltrees.length > 0 && (
 <tfoot className="bg-gray-50 border-t-2 border-gray-300">
 <tr className="font-semibold">
 <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">TOTAL</td>
 <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatEuro(totaux.totalHT)}</td>
 <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatEuro(totaux.totalTVA)}</td>
 <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatEuro(totaux.totalTTC)}</td>
 <td colSpan={3} className="px-6 py-4"></td>
 </tr>
 {totaux.totalAvoir > 0 && (
 <tr className="text-gray-600">
 <td colSpan={2} className="px-6 py-2 text-sm">Dont avoirs</td>
 <td className="px-6 py-2 text-sm text-right">-{formatEuro(totaux.totalAvoir)}</td>
 <td colSpan={5}></td>
 </tr>
 )}
 </tfoot>
 )}
 </table>
 </div>
 </div>
 </div>
 );
};

export default FacturationTable;