import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
 Bell,
 AlertTriangle,
 FileText,
 DollarSign,
 TrendingDown,
 CheckCircle,
 Circle,
 Trash2,
 Filter,
 Eye,
 EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
 id: string;
 type: 'retard' | 'alerte_score' | 'facture_echue' | 'avenant' | 'document';
 titre: string;
 message: string;
 chantier_id?: string;
 chantier_nom?: string;
 date_creation: string;
 lu: boolean;
 priorite: 'basse' | 'moyenne' | 'haute';
}

const NotificationsPage: React.FC = () => {
 const queryClient = useQueryClient();
 const [filterType, setFilterType] = useState<string>('all');
 const [filterLu, setFilterLu] = useState<string>('all');
 const [filterPriorite, setFilterPriorite] = useState<string>('all');

 // Récupération des notifications
 const { data: notifications = [], isLoading } = useQuery({
 queryKey: ['notifications'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('notifications')
 .select(`
 *,
 chantier:chantiers(nom)
 `)
 .order('date_creation', { ascending: false });

 if (error) throw error;

 return (data || []).map((n: any) => ({
 id: n.id,
 type: n.type,
 titre: n.titre,
 message: n.message,
 chantier_id: n.chantier_id,
 chantier_nom: n.chantier?.nom || null,
 date_creation: n.date_creation,
 lu: n.lu || false,
 priorite: n.priorite || 'moyenne',
 })) as Notification[];
 },
 });

 // Marquer comme lu
 const marquerLuMutation = useMutation({
 mutationFn: async ({ id, lu }: { id: string; lu: boolean }) => {
 const { error } = await supabase.from('notifications').update({ lu }).eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['notifications'] });
 },
 });

 // Supprimer notification
 const supprimerMutation = useMutation({
 mutationFn: async (id: string) => {
 const { error } = await supabase.from('notifications').delete().eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['notifications'] });
 },
 });

 // Marquer toutes comme lues
 const marquerToutesLuesMutation = useMutation({
 mutationFn: async () => {
 const { error } = await supabase.from('notifications').update({ lu: true }).eq('lu', false);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['notifications'] });
 },
 });

 // Filtrage
 const notificationsFiltered = notifications.filter((n) => {
 if (filterType !== 'all' && n.type !== filterType) return false;
 if (filterLu === 'lu' && !n.lu) return false;
 if (filterLu === 'non_lu' && n.lu) return false;
 if (filterPriorite !== 'all' && n.priorite !== filterPriorite) return false;
 return true;
 });

 const getIconByType = (type: string) => {
 switch (type) {
 case 'retard':
 return <AlertTriangle className="w-5 h-5 text-orange-600" />;
 case 'alerte_score':
 return <TrendingDown className="w-5 h-5 text-red-600" />;
 case 'facture_echue':
 return <DollarSign className="w-5 h-5 text-purple-600" />;
 case 'avenant':
 return <FileText className="w-5 h-5 text-blue-600" />;
 case 'document':
 return <FileText className="w-5 h-5 text-green-600" />;
 default:
 return <Bell className="w-5 h-5 text-gray-600" />;
 }
 };

 const getBgColorByType = (type: string, lu: boolean) => {
 const opacity = lu ? '50' : '100';
 switch (type) {
 case 'retard':
 return `bg-orange-${opacity}`;
 case 'alerte_score':
 return `bg-red-${opacity}`;
 case 'facture_echue':
 return `bg-purple-${opacity}`;
 case 'avenant':
 return `bg-blue-${opacity}`;
 case 'document':
 return `bg-green-${opacity}`;
 default:
 return `bg-gray-${opacity}`;
 }
 };

 const getPrioriteBadge = (priorite: string) => {
 switch (priorite) {
 case 'haute':
 return 'bg-red-100 text-red-800';
 case 'moyenne':
 return 'bg-orange-100 text-orange-800';
 case 'basse':
 return 'bg-green-100 text-green-800';
 default:
 return 'bg-gray-100 text-gray-800';
 }
 };

 const nbNonLues = notifications.filter((n) => !n.lu).length;

 if (isLoading) {
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
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
 <Bell className="w-8 h-8 text-blue-600" />
 Notifications
 {nbNonLues > 0 && (
 <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
 {nbNonLues}
 </span>
 )}
 </h1>
 <p className="text-gray-600 mt-1">Centre de notifications et alertes</p>
 </div>
 <button
 onClick={() => marquerToutesLuesMutation.mutate()}
 disabled={nbNonLues === 0 || marquerToutesLuesMutation.isPending}
 className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 <CheckCircle className="w-5 h-5" />
 Tout marquer comme lu
 </button>
 </div>

 {/* Statistiques */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
 <p className="text-sm text-blue-600 font-medium">Total</p>
 <p className="text-2xl font-bold text-blue-900">{notifications.length}</p>
 </div>
 <div className="bg-red-50 rounded-lg p-4 border border-red-200">
 <p className="text-sm text-red-600 font-medium">Non lues</p>
 <p className="text-2xl font-bold text-red-900">{nbNonLues}</p>
 </div>
 <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
 <p className="text-sm text-orange-600 font-medium">Priorité haute</p>
 <p className="text-2xl font-bold text-orange-900">
 {notifications.filter((n) => n.priorite === 'haute').length}
 </p>
 </div>
 <div className="bg-green-50 rounded-lg p-4 border border-green-200">
 <p className="text-sm text-green-600 font-medium">Aujourd'hui</p>
 <p className="text-2xl font-bold text-green-900">
 {
 notifications.filter(
 (n) =>
 format(new Date(n.date_creation), 'yyyy-MM-dd') ===
 format(new Date(), 'yyyy-MM-dd')
 ).length
 }
 </p>
 </div>
 </div>

 {/* Filtres */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
 <select
 value={filterType}
 onChange={(e) => setFilterType(e.target.value)}
 className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="all">Tous les types</option>
 <option value="retard">Retard</option>
 <option value="alerte_score">Alerte score</option>
 <option value="facture_echue">Facture échue</option>
 <option value="avenant">Avenant</option>
 <option value="document">Document</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Statut de lecture</label>
 <select
 value={filterLu}
 onChange={(e) => setFilterLu(e.target.value)}
 className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="all">Toutes</option>
 <option value="non_lu">Non lues</option>
 <option value="lu">Lues</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
 <select
 value={filterPriorite}
 onChange={(e) => setFilterPriorite(e.target.value)}
 className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="all">Toutes les priorités</option>
 <option value="haute">Haute</option>
 <option value="moyenne">Moyenne</option>
 <option value="basse">Basse</option>
 </select>
 </div>
 </div>
 </div>

 {/* Liste des notifications */}
 <div className="bg-white rounded-lg shadow-md overflow-hidden">
 {notificationsFiltered.length === 0 ? (
 <div className="p-12 text-center">
 <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
 <h3 className="text-xl font-semibold text-gray-600 mb-2">Aucune notification</h3>
 <p className="text-gray-500">
 {notifications.length === 0
 ? "Vous n'avez aucune notification pour le moment."
 : 'Aucune notification ne correspond aux filtres sélectionnés.'}
 </p>
 </div>
 ) : (
 <div className="divide-y divide-gray-200">
 {notificationsFiltered.map((notification) => (
 <div
 key={notification.id}
 className={`p-6 hover:bg-gray-50 transition-colors ${
 !notification.lu ? 'bg-blue-50' : ''
 }`}
 >
 <div className="flex items-start gap-4">
 {/* Icône */}
 <div className="flex-shrink-0 mt-1">{getIconByType(notification.type)}</div>

 {/* Contenu */}
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-2">
 <h3 className="text-lg font-semibold text-gray-900">
 {notification.titre}
 </h3>
 <span
 className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPrioriteBadge(
 notification.priorite
 )}`}
 >
 {notification.priorite}
 </span>
 {!notification.lu && (
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
 Nouveau
 </span>
 )}
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() =>
 marquerLuMutation.mutate({
 id: notification.id,
 lu: !notification.lu,
 })
 }
 className="text-gray-400 hover:text-blue-600 transition-colors p-1"
 title={notification.lu ? 'Marquer comme non lu' : 'Marquer comme lu'}
 >
 {notification.lu ? (
 <EyeOff className="w-5 h-5" />
 ) : (
 <Eye className="w-5 h-5" />
 )}
 </button>
 <button
 onClick={() => {
 if (confirm('Supprimer cette notification ?')) {
 supprimerMutation.mutate(notification.id);
 }
 }}
 className="text-gray-400 hover:text-red-600 transition-colors p-1"
 title="Supprimer"
 >
 <Trash2 className="w-5 h-5" />
 </button>
 </div>
 </div>

 <p className="text-gray-700 mb-2">{notification.message}</p>

 <div className="flex items-center gap-4 text-sm text-gray-500">
 <span className="flex items-center gap-1">
 <Bell className="w-4 h-4" />
 {format(new Date(notification.date_creation), 'dd MMMM yyyy à HH:mm', {
 locale: fr,
 })}
 </span>
 {notification.chantier_nom && (
 <span className="flex items-center gap-1">
 <FileText className="w-4 h-4" />
 Chantier: {notification.chantier_nom}
 </span>
 )}
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
 {notification.type.replace('_', ' ')}
 </span>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
};

export default NotificationsPage;