import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronDown, ChevronRight, Filter, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Tache {
 id: string;
 chantier_id: string;
 phase: string;
 numero: number;
 nom: string;
 statut: string;
 priorite: string;
 date_debut: string | null;
 date_fin_prevue: string | null;
 date_fin_reelle: string | null;
 commentaire: string | null;
 poids: number;
}

interface ChecklistProcessProps {
 chantierId: string;
}

const TACHES_TEMPLATE = [
 // Phase \u00c9tudes
 { phase: '\u00c9tudes', numero: 1, nom: 'Plans de r\u00e9servation', poids: 10 },
 { phase: '\u00c9tudes', numero: 2, nom: 'Bilan des fluides', poids: 10 },
 { phase: '\u00c9tudes', numero: 3, nom: 'Fiches techniques', poids: 10 },
 { phase: '\u00c9tudes', numero: 4, nom: 'Devis/Avenants', poids: 15 },
 { phase: '\u00c9tudes', numero: 5, nom: 'Avancement global', poids: 5 },
 { phase: '\u00c9tudes', numero: 6, nom: 'Travaux r\u00e9alis\u00e9s', poids: 10 },
 // Phase Ex\u00e9cution
 { phase: 'Ex\u00e9cution', numero: 7, nom: 'Planning respect\u00e9', poids: 10 },
 { phase: 'Ex\u00e9cution', numero: 8, nom: 'Commandes pass\u00e9es', poids: 8 },
 { phase: 'Ex\u00e9cution', numero: 9, nom: 'Livraisons', poids: 8 },
 { phase: 'Ex\u00e9cution', numero: 10, nom: 'Contraintes techniques', poids: 10 },
 { phase: 'Ex\u00e9cution', numero: 11, nom: 'Contraintes administratives', poids: 10 },
 { phase: 'Ex\u00e9cution', numero: 12, nom: 'D\u00e9claration sous-traitance', poids: 5 },
 { phase: 'Ex\u00e9cution', numero: 13, nom: 'Coordination autres corps d\'\u00e9tat', poids: 8 },
 { phase: 'Ex\u00e9cution', numero: 14, nom: 'Coordination sous-traitants', poids: 8 },
 { phase: 'Ex\u00e9cution', numero: 15, nom: 'Visite/inspection commune', poids: 8 },
 { phase: 'Ex\u00e9cution', numero: 16, nom: 'Avancement facturable', poids: 10 },
 { phase: 'Ex\u00e9cution', numero: 17, nom: 'Information transmise \u00e0 Irena', poids: 5 },
 // Phase OPR/R\u00e9ception
 { phase: 'OPR/R\u00e9ception', numero: 18, nom: 'OPR r\u00e9alis\u00e9e', poids: 15 },
 { phase: 'OPR/R\u00e9ception', numero: 19, nom: 'Liste des r\u00e9serves', poids: 10 },
 { phase: 'OPR/R\u00e9ception', numero: 20, nom: 'R\u00e9ception', poids: 15 },
 { phase: 'OPR/R\u00e9ception', numero: 21, nom: 'Mise en service', poids: 10 },
 { phase: 'OPR/R\u00e9ception', numero: 22, nom: 'DOE', poids: 10 },
 { phase: 'OPR/R\u00e9ception', numero: 23, nom: 'Remise des cl\u00e9s', poids: 5 },
 { phase: 'OPR/R\u00e9ception', numero: 24, nom: '\u00c9tiquetage mat\u00e9riels', poids: 5 },
 { phase: 'OPR/R\u00e9ception', numero: 25, nom: 'DGD', poids: 10 },
 { phase: 'OPR/R\u00e9ception', numero: 26, nom: 'Communication client', poids: 8 },
 { phase: 'OPR/R\u00e9ception', numero: 27, nom: 'Photos chantier', poids: 5 },
 { phase: 'OPR/R\u00e9ception', numero: 28, nom: 'Transmission fiche', poids: 8 },
 { phase: 'OPR/R\u00e9ception', numero: 29, nom: 'Impact', poids: 10 },
 { phase: 'OPR/R\u00e9ception', numero: 30, nom: 'Synth\u00e8se technique', poids: 10 },
];

const ChecklistProcess: React.FC<ChecklistProcessProps> = ({ chantierId }) => {
 const [taches, setTaches] = useState<Tache[]>([]);
 const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['\u00c9tudes']));
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
 table: 'taches_process',
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
 .from('taches_process')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('numero');

 if (error) throw error;

 // Si aucune t\u00e2che, initialiser avec le template
 if (!data || data.length === 0) {
 await initializeTaches();
 } else {
 setTaches(data);
 }
 } catch (error: any) {
 console.error('Erreur chargement t\u00e2ches:', error);
 toast.error('Erreur lors du chargement des t\u00e2ches');
 } finally {
 setLoading(false);
 }
 };

 const initializeTaches = async () => {
 try {
 const tachesInit = TACHES_TEMPLATE.map((t) => ({
 chantier_id: chantierId,
 phase: t.phase,
 numero: t.numero,
 nom: t.nom,
 statut: '\u00c0 faire',
 priorite: 'Normale',
 poids: t.poids,
 date_debut: null,
 date_fin_prevue: null,
 date_fin_reelle: null,
 commentaire: null,
 }));

 const { data, error } = await supabase
 .from('taches_process')
 .insert(tachesInit)
 .select();

 if (error) throw error;
 setTaches(data || []);
 toast.success('Checklist initialis\u00e9e');
 } catch (error: any) {
 console.error('Erreur initialisation t\u00e2ches:', error);
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
 .from('taches_process')
 .update(updates)
 .eq('id', tacheId);

 if (error) throw error;
 } catch (error: any) {
 console.error('Erreur mise \u00e0 jour t\u00e2che:', error);
 toast.error('Erreur lors de la mise \u00e0 jour');
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

 const totalPoids = phaseTaches.reduce((sum, t) => sum + t.poids, 0);
 const poidsTermines = phaseTaches
 .filter((t) => t.statut === 'Termin\u00e9')
 .reduce((sum, t) => sum + t.poids, 0);

 return totalPoids > 0 ? Math.round((poidsTermines / totalPoids) * 100) : 0;
 };

 const getGlobalScore = () => {
 if (taches.length === 0) return 0;

 const totalPoids = taches.reduce((sum, t) => sum + t.poids, 0);
 const poidsTermines = taches
 .filter((t) => t.statut === 'Termin\u00e9')
 .reduce((sum, t) => sum + t.poids, 0);

 return totalPoids > 0 ? Math.round((poidsTermines / totalPoids) * 100) : 0;
 };

 const filteredTaches = (phase: string) => {
 let filtered = taches.filter((t) => t.phase === phase);

 switch (filter) {
 case 'late':
 filtered = filtered.filter(
 (t) =>
 t.date_fin_prevue &&
 new Date(t.date_fin_prevue) < new Date() &&
 t.statut !== 'Termin\u00e9'
 );
 break;
 case 'blocked':
 filtered = filtered.filter((t) => t.statut === 'Bloqu\u00e9');
 break;
 case 'upcoming':
 filtered = filtered.filter((t) => t.statut === '\u00c0 faire');
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
 case 'Termin\u00e9':
 return 'bg-green-100 text-green-800';
 case 'En cours':
 return 'bg-blue-100 text-blue-800';
 case 'Bloqu\u00e9':
 return 'bg-red-100 text-red-800';
 default:
 return 'bg-gray-100 text-gray-800';
 }
 };

 const phases = ['\u00c9tudes', 'Ex\u00e9cution', 'OPR/R\u00e9ception'];

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
 <p className="text-sm text-gray-500 mt-1">30 t\u00e2ches \u2022 Score global</p>
 </div>
 <div className="text-right">
 <p className="text-3xl font-bold text-blue-600">{getGlobalScore()}%</p>
 <p className="text-xs text-gray-500">
 {taches.filter((t) => t.statut === 'Termin\u00e9').length}/{taches.length} termin\u00e9es
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
 Bloqu\u00e9es
 </button>
 <button
 onClick={() => setFilter('upcoming')}
 className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
 filter === 'upcoming'
 ? 'bg-purple-100 text-purple-800'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 \u00c0 venir
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
 {phaseTaches.length} t\u00e2che{phaseTaches.length > 1 ? 's' : ''}
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
 statut: tache.statut === 'Termin\u00e9' ? '\u00c0 faire' : 'Termin\u00e9',
 date_fin_reelle:
 tache.statut === 'Termin\u00e9'
 ? null
 : new Date().toISOString(),
 })
 }
 className="mt-1 flex-shrink-0"
 >
 <CheckCircle2
 className={`w-5 h-5 ${
 tache.statut === 'Termin\u00e9'
 ? 'text-green-600 fill-green-600'
 : 'text-gray-300'
 }`}
 />
 </button>

 {/* Tache info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center space-x-2 mb-2">
 <span className="text-xs font-medium text-gray-500">
 #{tache.numero}
 </span>
 <h4
 className={`font-medium ${
 tache.statut === 'Termin\u00e9'
 ? 'text-gray-400 line-through'
 : 'text-gray-900'
 }`}
 >
 {tache.nom}
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
 <option value="\u00c0 faire">\u00c0 faire</option>
 <option value="En cours">En cours</option>
 <option value="Termin\u00e9">Termin\u00e9</option>
 <option value="Bloqu\u00e9">Bloqu\u00e9</option>
 </select>

 {/* Priorit\u00e9 dropdown */}
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
 <option value="Haute">\ud83d\udd34 Haute</option>
 <option value="Normale">\ud83d\udfe0 Normale</option>
 <option value="Basse">\ud83d\udfe2 Basse</option>
 </select>

 <span className="text-xs text-gray-500">
 Poids: {tache.poids}
 </span>
 </div>

 {/* Dates */}
 <div className="grid grid-cols-3 gap-4 text-xs">
 <div>
 <label className="text-gray-500 block mb-1">D\u00e9but</label>
 <input
 type="date"
 value={tache.date_debut || ''}
 onChange={(e) =>
 updateTache(tache.id, { date_debut: e.target.value })
 }
 className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 <div>
 <label className="text-gray-500 block mb-1">Fin pr\u00e9vue</label>
 <input
 type="date"
 value={tache.date_fin_prevue || ''}
 onChange={(e) =>
 updateTache(tache.id, { date_fin_prevue: e.target.value })
 }
 className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 <div>
 <label className="text-gray-500 block mb-1">Fin r\u00e9elle</label>
 <input
 type="date"
 value={tache.date_fin_reelle || ''}
 onChange={(e) =>
 updateTache(tache.id, { date_fin_reelle: e.target.value })
 }
 className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 disabled={tache.statut !== 'Termin\u00e9'}
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
 Aucune t\u00e2che ne correspond aux filtres
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