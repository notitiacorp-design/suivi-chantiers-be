import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronDown, ChevronRight, Filter, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Tache {
 id: string;
 chantier_id: string;
 phase: string;
 ordre: number;
 titre: string;
 statut: string;
 priorite: string;
 created_at: string;
 date_echeance: string | null;
 
 commentaire: string | null;
 pourcentage: number;
}

interface ChecklistProcessProps {
 chantierId: string;
}

const TACHES_TEMPLATE = [
 // Phase Études
 { phase: 'Études', ordre: 1, titre: 'Plans de réservation', pourcentage: 10 },
 { phase: 'Études', ordre: 2, titre: 'Bilan des fluides', pourcentage: 10 },
 { phase: 'Études', ordre: 3, titre: 'Fiches techniques', pourcentage: 10 },
 { phase: 'Études', ordre: 4, titre: 'Devis/Avenants', pourcentage: 15 },
 { phase: 'Études', ordre: 5, titre: 'Avancement global', pourcentage: 5 },
 { phase: 'Études', ordre: 6, titre: 'Travaux réalisés', pourcentage: 10 },
 // Phase Exécution
 { phase: 'Exécution', ordre: 7, titre: 'Planning respecté', pourcentage: 10 },
 { phase: 'Exécution', ordre: 8, titre: 'Commandes passées', pourcentage: 8 },
 { phase: 'Exécution', ordre: 9, titre: 'Livraisons', pourcentage: 8 },
 { phase: 'Exécution', ordre: 10, titre: 'Contraintes techniques', pourcentage: 10 },
 { phase: 'Exécution', ordre: 11, titre: 'Contraintes administratives', pourcentage: 10 },
 { phase: 'Exécution', ordre: 12, titre: 'Déclaration sous-traitance', pourcentage: 5 },
 { phase: 'Exécution', ordre: 13, titre: 'Coordination autres corps d\'état', pourcentage: 8 },
 { phase: 'Exécution', ordre: 14, titre: 'Coordination sous-traitants', pourcentage: 8 },
 { phase: 'Exécution', ordre: 15, titre: 'Visite/inspection commune', pourcentage: 8 },
 { phase: 'Exécution', ordre: 16, titre: 'Avancement facturable', pourcentage: 10 },
 { phase: 'Exécution', ordre: 17, titre: 'Information transmise à Irena', pourcentage: 5 },
 // Phase OPR/Réception
 { phase: 'OPR/Réception', ordre: 18, titre: 'OPR réalisée', pourcentage: 15 },
 { phase: 'OPR/Réception', ordre: 19, titre: 'Liste des réserves', pourcentage: 10 },
 { phase: 'OPR/Réception', ordre: 20, titre: 'Réception', pourcentage: 15 },
 { phase: 'OPR/Réception', ordre: 21, titre: 'Mise en service', pourcentage: 10 },
 { phase: 'OPR/Réception', ordre: 22, titre: 'DOE', pourcentage: 10 },
 { phase: 'OPR/Réception', ordre: 23, titre: 'Remise des clés', pourcentage: 5 },
 { phase: 'OPR/Réception', ordre: 24, titre: 'Étiquetage matériels', pourcentage: 5 },
 { phase: 'OPR/Réception', ordre: 25, titre: 'DGD', pourcentage: 10 },
 { phase: 'OPR/Réception', ordre: 26, titre: 'Communication client', pourcentage: 8 },
 { phase: 'OPR/Réception', ordre: 27, titre: 'Photos chantier', pourcentage: 5 },
 { phase: 'OPR/Réception', ordre: 28, titre: 'Transmission fiche', pourcentage: 8 },
 { phase: 'OPR/Réception', ordre: 29, titre: 'Impact', pourcentage: 10 },
 { phase: 'OPR/Réception', ordre: 30, titre: 'Synthèse technique', pourcentage: 10 },
];

const ChecklistProcess: React.FC<ChecklistProcessProps> = ({ chantierId }) => {
 const [taches, setTaches] = useState<Tache[]>([]);
 const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['Études']));
 const [filter, setFilter] = useState<string>('all');
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 loadTaches();

 // Supabase realtime
 const channel = supabase
 .channel(`taches-${chantierId}`)
 .on(
 'postgres_changes',
 {
 event: '*',
 schema: 'public',
 table: 'taches',
 filter: `chantier_id=eq.${chantierId}`,
 },
 () => {
 loadTaches();
 }
 )
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 }, [chantierId]);

 const loadTaches = async () => {
 try {
 setLoading(true);
 const { data, error } = await supabase
 .from('taches')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('ordre');

 if (error) throw error;

 // Si aucune tâche, initialiser avec le template
 if (!data || data.length === 0) {
 await initializeTaches();
 } else {
 setTaches(data);
 }
 } catch (error: any) {
 console.error('Erreur chargement tâches:', error);
 toast.error('Erreur lors du chargement des tâches');
 } finally {
 setLoading(false);
 }
 };

 const initializeTaches = async () => {
 try {
 const tachesInit = TACHES_TEMPLATE.map((t) => ({
 chantier_id: chantierId,
 phase: t.phase,
 ordre: t.ordre,
 titre: t.titre,
 statut: 'À faire',
 priorite: 'Normale',
 poids: t.pourcentage,
 created_at: null,
 date_fin_prevue: null,
 date_fin_reelle: null,
 commentaire: null,
 }));

 const { data, error } = await supabase
 .from('taches')
 .insert(tachesInit)
 .select();

 if (error) throw error;
 setTaches(data || []);
 toast.success('Checklist initialisée');
 } catch (error: any) {
 console.error('Erreur initialisation tâches:', error);
 toast.error('Erreur lors de l\'initialisation');
 }
 };

 const updateTache = async (tacheId: string, updates: Partial<Tache>) => {
 try {
 // Optimistic update
 setTaches((prev) =>
 prev.map((t) => (t.id === tacheId ? { ...t, ...updates } : t))
 );

 const { error } = await supabase
 .from('taches')
 .update(updates)
 .eq('id', tacheId);

 if (error) throw error;
 } catch (error: any) {
 console.error('Erreur mise à jour tâche:', error);
 toast.error('Erreur lors de la mise à jour');
 loadTaches(); // Reload on error
 }
 };

 const togglePhase = (phase: string) => {
 setExpandedPhases((prev) => {
 const newSet = new Set(prev);
 if (newSet.has(phase)) {
 newSet.delete(phase);
 } else {
 newSet.add(phase);
 }
 return newSet;
 });
 };

 const getPhaseProgress = (phase: string) => {
 const phaseTaches = taches.filter((t) => t.phase === phase);
 if (phaseTaches.length === 0) return 0;

 const totalPoids = phaseTaches.reduce((sum, t) => sum + t.pourcentage, 0);
 const poidsTermines = phaseTaches
 .filter((t) => t.statut === 'Terminé')
 .reduce((sum, t) => sum + t.pourcentage, 0);

 return totalPoids > 0 ? Math.round((poidsTermines / totalPoids) * 100) : 0;
 };

 const getGlobalScore = () => {
 if (taches.length === 0) return 0;

 const totalPoids = taches.reduce((sum, t) => sum + t.pourcentage, 0);
 const poidsTermines = taches
 .filter((t) => t.statut === 'Terminé')
 .reduce((sum, t) => sum + t.pourcentage, 0);

 return totalPoids > 0 ? Math.round((poidsTermines / totalPoids) * 100) : 0;
 };

 const filteredTaches = (phase: string) => {
 let filtered = taches.filter((t) => t.phase === phase);

 switch (filter) {
 case 'late':
 filtered = filtered.filter(
 (t) =>
 t.date_echeance &&
 new Date(t.date_echeance) < new Date() &&
 t.statut !== 'Terminé'
 );
 break;
 case 'blocked':
 filtered = filtered.filter((t) => t.statut === 'Bloqué');
 break;
 case 'upcoming':
 filtered = filtered.filter((t) => t.statut === 'À faire');
 break;
 }

 return filtered;
 };

 const getPrioriteColor = (priorite: string) => {
 switch (priorite) {
 case 'Haute':
 return 'bg-red-100 text-red-800 border-red-300';
 case 'Normale':
 return 'bg-orange-100 text-orange-800 border-orange-300';
 case 'Basse':
 return 'bg-green-100 text-green-800 border-green-300';
 default:
 return 'bg-gray-100 text-gray-800 border-gray-300';
 }
 };

 const getStatutColor = (statut: string) => {
 switch (statut) {
 case 'Terminé':
 return 'bg-green-100 text-green-800';
 case 'En cours':
 return 'bg-blue-100 text-blue-800';
 case 'Bloqué':
 return 'bg-red-100 text-red-800';
 default:
 return 'bg-gray-100 text-gray-800';
 }
 };

 const phases = ['Études', 'Exécution', 'OPR/Réception'];

 if (loading) {
 return (
 <div className="flex justify-center items-center py-12">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header avec score global et filtres */}
 <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h2 className="text-lg font-semibold text-gray-900">Checklist Process BE</h2>
 <p className="text-sm text-gray-500 mt-1">30 tâches • Score global</p>
 </div>
 <div className="text-right">
 <p className="text-3xl font-bold text-blue-600">{getGlobalScore()}%</p>
 <p className="text-xs text-gray-500">
 {taches.filter((t) => t.statut === 'Terminé').length}/{taches.length} terminées
 </p>
 </div>
 </div>

 {/* Filtres */}
 <div className="flex items-center space-x-2">
 <Filter className="w-4 h-4 text-gray-400" />
 <button
 onClick={() => setFilter('all')}
 className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
 filter === 'all'
 ? 'bg-blue-100 text-blue-800'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 Toutes
 </button>
 <button
 onClick={() => setFilter('late')}
 className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
 filter === 'late'
 ? 'bg-red-100 text-red-800'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 En retard
 </button>
 <button
 onClick={() => setFilter('blocked')}
 className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
 filter === 'blocked'
 ? 'bg-orange-100 text-orange-800'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 Bloquées
 </button>
 <button
 onClick={() => setFilter('upcoming')}
 className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
 filter === 'upcoming'
 ? 'bg-purple-100 text-purple-800'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 À venir
 </button>
 </div>
 </div>

 {/* Accordion par phase */}
 <div className="space-y-4">
 {phases.map((phase) => {
 const phaseTaches = filteredTaches(phase);
 const progress = getPhaseProgress(phase);
 const isExpanded = expandedPhases.has(phase);

 return (
 <div key={phase} className="bg-white rounded-lg shadow border border-gray-200">
 {/* Phase header */}
 <button
 onClick={() => togglePhase(phase)}
 className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
 >
 <div className="flex items-center space-x-3">
 {isExpanded ? (
 <ChevronDown className="w-5 h-5 text-gray-400" />
 ) : (
 <ChevronRight className="w-5 h-5 text-gray-400" />
 )}
 <h3 className="text-lg font-semibold text-gray-900">{phase}</h3>
 <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
 {phaseTaches.length} tâche{phaseTaches.length > 1 ? 's' : ''}
 </span>
 </div>
 <div className="flex items-center space-x-4">
 <div className="text-right mr-4">
 <p className="text-sm font-semibold text-gray-900">{progress}%</p>
 </div>
 <div className="w-32 bg-gray-200 rounded-full h-2">
 <div
 className="bg-blue-600 h-2 rounded-full transition-all duration-300"
 style={{ width: `${progress}%` }}
 />
 </div>
 </div>
 </button>

 {/* Phase content */}
 {isExpanded && (
 <div className="px-6 pb-4">
 {phaseTaches.length > 0 ? (
 <div className="space-y-2">
 {phaseTaches.map((tache) => (
 <div
 key={tache.id}
 className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
 >
 <div className="flex items-start space-x-4">
 {/* Checkbox */}
 <button
 onClick={() =>
 updateTache(tache.id, {
 statut: tache.statut === 'Terminé' ? 'À faire' : 'Terminé',
 date_fin_reelle:
 tache.statut === 'Terminé'
 ? null
 : new Date().toISOString(),
 })
 }
 className="mt-1 flex-shrink-0"
 >
 <CheckCircle2
 className={`w-5 h-5 ${
 tache.statut === 'Terminé'
 ? 'text-green-600 fill-green-600'
 : 'text-gray-300'
 }`}
 />
 </button>

 {/* Tache info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center space-x-2 mb-2">
 <span className="text-xs font-medium text-gray-500">
 #{tache.ordre}
 </span>
 <h4
 className={`font-medium ${
 tache.statut === 'Terminé'
 ? 'text-gray-400 line-through'
 : 'text-gray-900'
 }`}
 >
 {tache.titre}
 </h4>
 </div>

 <div className="flex flex-wrap items-center gap-2 mb-3">
 {/* Statut dropdown */}
 <select
 value={tache.statut}
 onChange={(e) => updateTache(tache.id, { statut: e.target.value })}
 className={`px-2 py-1 text-xs font-medium rounded-md border-0 focus:ring-2 focus:ring-blue-500 ${
 getStatutColor(tache.statut)
 }`}
 onClick={(e) => e.stopPropagation()}
 >
 <option value="À faire">À faire</option>
 <option value="En cours">En cours</option>
 <option value="Terminé">Terminé</option>
 <option value="Bloqué">Bloqué</option>
 </select>

 {/* Priorité dropdown */}
 <select
 value={tache.priorite}
 onChange={(e) =>
 updateTache(tache.id, { priorite: e.target.value })
 }
 className={`px-2 py-1 text-xs font-medium rounded-md border focus:ring-2 focus:ring-blue-500 ${
 getPrioriteColor(tache.priorite)
 }`}
 onClick={(e) => e.stopPropagation()}
 >
 <option value="Haute">🔴 Haute</option>
 <option value="Normale">🟠 Normale</option>
 <option value="Basse">🟢 Basse</option>
 </select>

 <span className="text-xs text-gray-500">
 Poids: {tache.pourcentage}
 </span>
 </div>

 {/* Dates */}
 <div className="grid grid-cols-3 gap-4 text-xs">
 <div>
 <label className="text-gray-500 block mb-1">Début</label>
 <input
 type="date"
 value={tache.created_at || ''}
 onChange={(e) =>
 updateTache(tache.id, { created_at: e.target.value })
 }
 className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 <div>
 <label className="text-gray-500 block mb-1">Fin prévue</label>
 <input
 type="date"
 value={tache.date_echeance || ''}
 onChange={(e) =>
 updateTache(tache.id, { date_fin_prevue: e.target.value })
 }
 className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 <div>
 <label className="text-gray-500 block mb-1">Fin réelle</label>
 <input
 type="date"
 value={tache.date_echeance || ''}
 onChange={(e) =>
 updateTache(tache.id, { date_fin_reelle: e.target.value })
 }
 className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 disabled={tache.statut !== 'Terminé'}
 />
 </div>
 </div>

 {/* Commentaire */}
 <div className="mt-3">
 <textarea
 value={tache.commentaire || ''}
 onChange={(e) =>
 updateTache(tache.id, { commentaire: e.target.value })
 }
 placeholder="Commentaire..."
 className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 rows={2}
 />
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-sm text-gray-500 text-center py-4">
 Aucune tâche ne correspond aux filtres
 </p>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 );
};

export default ChecklistProcess;