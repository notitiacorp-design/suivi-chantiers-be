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