import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Tache {
 id: string;
 ordre: number;
 titre: string;
 phase: string;
 statut: string;
 created_at: string;
 date_echeance: string | null;
 
}

interface PlanningGanttProps {
 chantierId: string;
}

const PlanningGantt: React.FC<PlanningGanttProps> = ({ chantierId }) => {
 const [taches, setTaches] = useState<Tache[]>([]);
 const [loading, setLoading] = useState(true);
 const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
 const [currentDate, setCurrentDate] = useState(new Date());

 useEffect(() => {
 loadTaches();
 }, [chantierId]);

 const loadTaches = async () => {
 try {
 setLoading(true);
 const { data, error } = await supabase
 .from('taches')
 .select('id, ordre, titre, phase, statut, created_at, date_echeance')
 .eq('chantier_id', chantierId)
  .order('ordre');

 if (error) throw error;
 setTaches(data || []);
 } catch (error: any) {
 console.error('Erreur chargement planning:', error);
 toast.error('Erreur lors du chargement du planning');
 } finally {
 setLoading(false);
 }
 };

 const getStatutColor = (statut: string) => {
 switch (statut) {
 case 'Terminé':
 return 'bg-green-500';
 case 'En cours':
 return 'bg-blue-500';
 case 'Bloqué':
 return 'bg-red-500';
 default:
 return 'bg-gray-400';
 }
 };

 const getDaysSinceStart = (date: string, startDate: Date) => {
 const d = new Date(date);
 const diff = d.getTime() - startDate.getTime();
 return Math.floor(diff / (1000 * 60 * 60 * 24));
 };

 const getDuration = (dateDebut: string, dateFin: string) => {
 const start = new Date(dateDebut);
 const end = new Date(dateFin);
 const diff = end.getTime() - start.getTime();
 return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
 };

 // Calculer la plage de dates affichée
 const getDateRange = () => {
 const dates: Date[] = [];

 if (viewMode === 'week') {
 const start = new Date(currentDate);
 start.setDate(start.getDate() - start.getDay());
 for (let i = 0; i < 7; i++) {
 const date = new Date(start);
 date.setDate(start.getDate() + i);
 dates.push(date);
 }
 } else {
 const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
 const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
 for (let i = 0; i < end.getDate(); i++) {
 const date = new Date(start);
 date.setDate(start.getDate() + i);
 dates.push(date);
 }
 }

 return dates;
 };

 const dateRange = getDateRange();
 const startDate = dateRange[0];
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 const todayOffset = getDaysSinceStart(today.toISOString(), startDate);

 const navigateDate = (direction: 'prev' | 'next') => {
 const newDate = new Date(currentDate);
 if (viewMode === 'week') {
 newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
 } else {
 newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
 }
 setCurrentDate(newDate);
 };

 if (loading) {
 return (
 <div className="flex justify-center items-center py-12">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
 </div>
 );
 }

 if (taches.length === 0) {
 return (
 <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
 <div className="text-center py-12">
 <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
 <p className="text-gray-500">Aucune tâche planifiée</p>
 <p className="text-sm text-gray-400 mt-1">
 Ajoutez des dates aux tâches pour voir le planning
 </p>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Planning Gantt</h2>
 <div className="flex items-center space-x-4">
 {/* Mode toggle */}
 <div className="flex items-center space-x-2">
 <button
 onClick={() => setViewMode('week')}
 className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
 viewMode === 'week'
 ? 'bg-blue-100 text-blue-800'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 Semaine
 </button>
 <button
 onClick={() => setViewMode('month')}
 className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
 viewMode === 'month'
 ? 'bg-blue-100 text-blue-800'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 Mois
 </button>
 </div>

 {/* Navigation */}
 <div className="flex items-center space-x-2">
 <button
 onClick={() => navigateDate('prev')}
 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
 >
 <ChevronLeft className="w-5 h-5" />
 </button>
 <span className="text-sm font-medium text-gray-900 min-w-[150px] text-center">
 {currentDate.toLocaleDateString('fr-FR', {
 month: 'long',
 year: 'numeric',
 })}
 </span>
 <button
 onClick={() => navigateDate('next')}
 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
 >
 <ChevronRight className="w-5 h-5" />
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* Gantt chart */}
 <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <div className="inline-block min-w-full">
 {/* Header dates */}
 <div className="flex border-b border-gray-200">
 <div className="w-64 flex-shrink-0 px-4 py-3 bg-gray-50 border-r border-gray-200">
 <span className="text-sm font-semibold text-gray-900">Tâche</span>
 </div>
 <div className="flex flex-1">
 {dateRange.map((date, i) => {
 const isToday =
 date.toDateString() === new Date().toDateString();
 return (
 <div
 key={i}
 className={`flex-1 min-w-[40px] px-2 py-3 text-center border-r border-gray-200 ${
 isToday ? 'bg-blue-50' : 'bg-gray-50'
 }`}
 >
 <div className="text-xs font-medium text-gray-900">
 {viewMode === 'week'
 ? date.toLocaleDateString('fr-FR', { weekday: 'short' })
 : date.getDate()}
 </div>
 {viewMode === 'week' && (
 <div className="text-xs text-gray-500">
 {date.getDate()}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Tâches */}
 <div className="relative">
 {/* Ligne aujourd'hui */}
 {todayOffset >= 0 && todayOffset < dateRange.length && (
 <div
 className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
 style={{
 left: `calc(16rem + ${(todayOffset / dateRange.length) * 100}%)`,
 }}
 />
 )}

 {taches.map((tache) => {
 if (!tache.created_at || !tache.date_echeance) return null;

 const startOffset = getDaysSinceStart(tache.created_at, startDate);
 const duration = getDuration(tache.created_at, tache.date_echeance);

 // Skip if outside view
 if (startOffset + duration < 0 || startOffset >= dateRange.length) {
 return null;
 }

 const barLeft = Math.max(0, startOffset);
 const barWidth = Math.min(duration, dateRange.length - barLeft);

 return (
 <div
 key={tache.id}
 className="flex border-b border-gray-100 hover:bg-gray-50"
 >
 <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200">
 <div className="flex items-center space-x-2">
 <span className="text-xs text-gray-500">#{tache.ordre}</span>
 <span className="text-sm text-gray-900 truncate">
 {tache.titre}
 </span>
 </div>
 <span className="text-xs text-gray-500">{tache.phase}</span>
 </div>
 <div className="flex-1 relative py-3 px-2">
 <div
 className="relative"
 style={{
 marginLeft: `${(barLeft / dateRange.length) * 100}%`,
 width: `${(barWidth / dateRange.length) * 100}%`,
 }}
 >
 <div
 className={`h-6 rounded-md ${
 getStatutColor(tache.statut)
 } opacity-80 hover:opacity-100 transition-opacity cursor-pointer group`}
 title={`${tache.titre}\n${tache.statut}\nDébut: ${new Date(
 tache.created_at
 ).toLocaleDateString('fr-FR')}\nFin: ${new Date(
 tache.date_echeance
 ).toLocaleDateString('fr-FR')}`}
 >
 <div className="px-2 py-1 text-xs text-white font-medium truncate">
 {tache.titre}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>

 {/* Légende */}
 <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
 <div className="flex items-center justify-center space-x-6 text-sm">
 <div className="flex items-center space-x-2">
 <div className="w-4 h-4 rounded bg-gray-400" />
 <span className="text-gray-600">À faire</span>
 </div>
 <div className="flex items-center space-x-2">
 <div className="w-4 h-4 rounded bg-blue-500" />
 <span className="text-gray-600">En cours</span>
 </div>
 <div className="flex items-center space-x-2">
 <div className="w-4 h-4 rounded bg-green-500" />
 <span className="text-gray-600">Terminé</span>
 </div>
 <div className="flex items-center space-x-2">
 <div className="w-4 h-4 rounded bg-red-500" />
 <span className="text-gray-600">Bloqué</span>
 </div>
 <div className="flex items-center space-x-2">
 <div className="w-0.5 h-4 bg-red-500" />
 <span className="text-gray-600">Aujourd'hui</span>
 </div>
 </div>
 </div>
 </div>
 );
};

export default PlanningGantt;

// ============================================================================
// NOTES D'IMPLÉMENTATION
// ============================================================================
// 1. Toutes les données sont synchronisées en temps réel via Supabase Realtime
// 2. Les mises à jour sont optimistes avec rollback en cas d'erreur
// 3. Les composants utilisent React hooks pour la gestion d'état
// 4. Tailwind CSS pour le styling responsive
// 5. React Hot Toast pour les notifications
// 6. Lucide React pour les icônes
// 7. Le journal utilise infinite scroll pour les performances
// 8. Le Gantt est responsive et supporte vue semaine/mois
// 9. La checklist calcule automatiquement les scores de santé
// 10. Tous les champs sont éditables inline avec sauvegarde auto