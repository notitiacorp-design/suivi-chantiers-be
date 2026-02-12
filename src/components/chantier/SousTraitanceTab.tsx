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
 prevu: 'Pr\u00e9vu',
 en_cours: 'En cours',
 termine: 'Termin\u00e9',
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
 if (confirm('\u00cates-vous s\u00fbr de vouloir supprimer ce sous-traitant ?')) {
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
 {totalMontant.toLocaleString('fr-FR')} \u20ac
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
 <div className="text-sm text-gray-600 mb-1">Sans D\u00e9claration ST</div>
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
 {sansDeclaration.length} sous-traitant(s) sans d\u00e9claration ST
 </h3>
 </div>
 <ul className="space-y-1 text-sm text-orange-800">
 {sansDeclaration.map(st => (
 <li key={st.id}>\u2022 {st.nom} - {st.metier}</li>
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
 <p className="text-gray-600">Aucun sous-traitant enregistr\u00e9</p>
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
 M\u00e9tier
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Contrat
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 D\u00e9claration ST
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
 {st.montant_contrat.toLocaleString('fr-FR')} \u20ac
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
 {/* Informations g\u00e9n\u00e9rales */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-3">Informations g\u00e9n\u00e9rales</h4>
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
 M\u00e9tier *
 </label>
 <input
 type="text"
 required
 value={formData.metier}
 onChange={(e) => setFormData({ ...formData, metier: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Ex: Plomberie, \u00c9lectricit\u00e9..."
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
 N\u00b0 Contrat *
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
 Montant Contrat (\u20ac) *
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
 <option value="prevu">Pr\u00e9vu</option>
 <option value="en_cours">En cours</option>
 <option value="termine">Termin\u00e9</option>
 <option value="suspendu">Suspendu</option>
 </select>
 </div>
 </div>
 </div>

 {/* D\u00e9claration ST */}
 <div>
 <h4 className="text-sm font-semibold text-gray-900 mb-3">D\u00e9claration Sous-Traitance</h4>
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
 D\u00e9claration ST effectu\u00e9e
 </span>
 </label>
 </div>

 {formData.declaration_st && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date D\u00e9claration
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
 Date D\u00e9but *
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
 Date Fin Pr\u00e9vue *
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
 Date Fin R\u00e9elle
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
 Heures Insertion Pr\u00e9vues *
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
 Heures Insertion R\u00e9alis\u00e9es *
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
 T\u00e9l\u00e9phone
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
 {mutation.isPending ? 'Enregistrement...' : sousTraitant ? 'Modifier' : 'Cr\u00e9er'}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
}