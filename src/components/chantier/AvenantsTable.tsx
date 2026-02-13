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
 objet: string;
 montant: number;
 date_demande: string;
 statut: AvenantStatut;
 commentaire: string | null;
 created_at: string;
 updated_at: string;
}

interface AvenantsTableProps {
 chantierId: string;
 budgetInitial?: number;
}

export default function AvenantsTable({ chantierId, budgetInitial = 0 }: AvenantsTableProps) {
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
 .order('date_demande', { ascending: false });

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
 {(budgetInitial || 0).toLocaleString('fr-FR')} €
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Total Avenants Acceptés</div>
 <div className={`text-2xl font-bold ${
 totalAvenantsAcceptes >= 0 ? 'text-green-600' : 'text-red-600'
 }`}>
 {totalAvenantsAcceptes >= 0 ? '+' : ''}{(totalAvenantsAcceptes || 0).toLocaleString('fr-FR')} €
 </div>
 </div>
 <div className="bg-white rounded-lg shadow p-6">
 <div className="text-sm text-gray-600 mb-1">Budget Actuel</div>
 <div className="text-2xl font-bold text-blue-600">
 {(budgetActuel || 0).toLocaleString('fr-FR')} €
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
 {avenant.objet}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`text-sm font-semibold ${
 avenant.montant >= 0 ? 'text-green-600' : 'text-red-600'
 }`}>
 {avenant.montant >= 0 ? '+' : ''}{avenant.(montant || 0).toLocaleString('fr-FR')} €
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
 {format(new Date(avenant.date_demande), 'dd/MM/yyyy', { locale: fr })}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 {getStatutBadge(avenant.statut)}
 </td>
 <td className="px-6 py-4 text-sm text-gray-600">
 {avenant.commentaire || '-'}
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
 objet: avenant?.objet || '',
 montant: avenant?.montant || 0,
 date_demande: avenant?.date_demande || new Date().toISOString().split('T')[0],
 statut: avenant?.statut || 'en_attente' as AvenantStatut,
 commentaire: avenant?.commentaire || '',
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
 value={formData.date_demande}
 onChange={(e) => setFormData({ ...formData, date_demande: e.target.value })}
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
 value={formData.objet}
 onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
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
 value={formData.commentaire}
 onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
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