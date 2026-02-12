import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
 MapPin,
 DollarSign,
 User,
 FileText,
 Calendar,
 AlertCircle,
 TrendingUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Chantier {
 id: string;
 nom: string;
 client: string;
 adresse: string;
 ville: string;
 code_postal: string;
 phase: string;
 statut: string;
 health_score: number;
 avancement_physique: number;
 date_debut: string;
 date_fin_prevue: string;
 date_fin_reelle: string | null;
 budget_initial: number;
 budget_actuel: number;
 montant_marche: number;
 depenses_actuelles: number;
 montant_facture: number;
 montant_avenants: number;
 taux_facturation: number;
 heures_prevues: number;
 heures_realisees: number;
 charge_affaires_id: string | null;
 description: string | null;
 lots: string[] | null;
 notes: string | null;
 priorite: string | null;
 actif: boolean;
 created_at: string;
 updated_at: string;
}

interface ChantierOverviewProps {
 chantier: Chantier;
 onUpdate: (updates: Partial<Chantier>) => void;
}

interface PhaseScore {
 phase: string;
 score: number;
 total_taches: number;
 taches_terminees: number;
}

interface JournalEntry {
 id: string;
 type: string;
 contenu: string;
 auteur: string;
 created_at: string;
}

interface Alert {
 id: string;
 titre: string;
 type: string;
 created_at: string;
}

const phaseLabels: { [key: string]: string } = {
 etude: 'Ãtude',
 preparation: 'PrÃ©paration',
 execution: 'ExÃ©cution',
 reception: 'RÃ©ception',
 garantie: 'Garantie',
};

const ChantierOverview: React.FC<ChantierOverviewProps> = ({ chantier, onUpdate }) => {
 const [editing, setEditing] = useState<string | null>(null);
 const [phaseScores, setPhaseScores] = useState<PhaseScore[]>([]);
 const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
 const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
 const [avancement, setAvancement] = useState(0);

 useEffect(() => {
 loadPhaseScores();
 loadRecentEntries();
 loadActiveAlerts();
 loadAvancement();
 }, [chantier.id]);

 const loadPhaseScores = async () => {
 try {
 const { data, error } = await supabase
 .from('taches_process')
 .select('phase, statut, poids')
 .eq('chantier_id', chantier.id);

 if (error) throw error;

 const phases = ['etude', 'preparation', 'execution', 'reception', 'garantie'];
 const scores: PhaseScore[] = phases.map((phase) => {
 const tachesPhase = data?.filter((t: any) => t.phase === phase) || [];
 const terminees = tachesPhase.filter((t: any) => t.statut === 'TerminÃ©');
 const score =
 tachesPhase.length > 0
 ? (terminees.reduce((sum: number, t: any) => sum + (t.poids || 0), 0) /
 tachesPhase.reduce((sum: number, t: any) => sum + (t.poids || 0), 0)) *
 100
 : 0;

 return {
 phase: phaseLabels[phase] || phase,
 score: Math.round(score),
 total_taches: tachesPhase.length,
 taches_terminees: terminees.length,
 };
 });

 setPhaseScores(scores);
 } catch (error: any) {
 console.error('Erreur chargement scores phases:', error);
 }
 };

 const loadRecentEntries = async () => {
 try {
 const { data, error } = await supabase
 .from('journal_chantier')
 .select('id, type, contenu, auteur, created_at')
 .eq('chantier_id', chantier.id)
 .order('created_at', { ascending: false })
 .limit(5);

 if (error) throw error;
 setRecentEntries(data || []);
 } catch (error: any) {
 console.error('Erreur chargement journal:', error);
 }
 };

 const loadActiveAlerts = async () => {
 try {
 const { data, error } = await supabase
 .from('notifications')
 .select('id, titre, type, created_at')
 .eq('chantier_id', chantier.id)
 .eq('lue', false)
 .order('created_at', { ascending: false });

 if (error) throw error;
 setActiveAlerts(data || []);
 } catch (error: any) {
 console.error('Erreur chargement alertes:', error);
 }
 };

 const loadAvancement = async () => {
 try {
 const { data, error } = await supabase
 .from('taches_process')
 .select('statut, poids')
 .eq('chantier_id', chantier.id);

 if (error) throw error;

 const totalPoids = data?.reduce((sum, t) => sum + (t.poids || 0), 0) || 0;
 const poidsTermines =
 data
 ?.filter((t) => t.statut === 'TerminÃ©')
 .reduce((sum, t) => sum + (t.poids || 0), 0) || 0;

 setAvancement(totalPoids > 0 ? Math.round((poidsTermines / totalPoids) * 100) : 0);
 } catch (error: any) {
 console.error('Erreur calcul avancement:', error);
 }
 };

 const handleEdit = (field: string, value: any) => {
 onUpdate({ [field]: value });
 setEditing(null);
 };

 const InfoCard = ({
 icon: Icon,
 label,
 value,
 field,
 type = 'text',
 }: {
 icon: any;
 label: string;
 value: any;
 field: string;
 type?: string;
 }) => (
 <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
 <div className="flex items-start justify-between">
 <div className="flex items-center space-x-3 flex-1">
 <div className="p-2 bg-blue-50 rounded-lg">
 <Icon className="w-5 h-5 text-blue-600" />
 </div>
 <div className="flex-1">
 <p className="text-xs text-gray-500 mb-1">{label}</p>
 {editing === field ? (
 <input
 type={type}
 defaultValue={value}
 onBlur={(e) => handleEdit(field, e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 handleEdit(field, (e.target as HTMLInputElement).value);
 }
 if (e.key === 'Escape') setEditing(null);
 }}
 className="w-full px-2 py-1 border border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
 autoFocus
 />
 ) : (
 <p
 className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
 onClick={() => setEditing(field)}
 >
 {type === 'number' && (field === 'budget_initial' || field === 'budget_actuel' || field === 'montant_marche')
 ? `${parseFloat(value || 0).toLocaleString('fr-FR')} â¬`
 : value || '-'}
 </p>
 )}
 </div>
 </div>
 </div>
 </div>
 );

 const getScoreColor = (score: number) => {
 if (score >= 80) return 'bg-green-500';
 if (score >= 60) return 'bg-yellow-500';
 if (score >= 40) return 'bg-orange-500';
 return 'bg-red-500';
 };

 const getTypeIcon = (type: string) => {
 switch (type) {
 case 'Alerte':
 case 'alerte':
 return 'ð¨';
 case 'Note':
 case 'note':
 return 'ð';
 case 'Modification':
 case 'modification':
 return 'âï¸';
 case 'Photo':
 case 'photo':
 return 'ð·';
 default:
 return 'ð';
 }
 };

 const getPrioriteFromType = (type: string): 'Haute' | 'Moyenne' | 'Basse' => {
 if (type === 'alerte' || type === 'Alerte') return 'Haute';
 if (type === 'avertissement' || type === 'warning') return 'Moyenne';
 return 'Basse';
 };

 return (
 <div className="space-y-6">
 {/* Informations gÃ©nÃ©rales */}
 <div>
 <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations gÃ©nÃ©rales</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 <InfoCard icon={MapPin} label="Adresse" value={chantier.adresse} field="adresse" />
 <InfoCard
 icon={DollarSign}
 label="Budget initial"
 value={chantier.budget_initial}
 field="budget_initial"
 type="number"
 />
 <InfoCard
 icon={DollarSign}
 label="Montant marchÃ©"
 value={chantier.montant_marche}
 field="montant_marche"
 type="number"
 />
 <InfoCard
 icon={User}
 label="Client"
 value={chantier.client}
 field="client"
 />
 <InfoCard
 icon={Calendar}
 label="Date dÃ©but"
 value={new Date(chantier.date_debut).toLocaleDateString('fr-FR')}
 field="date_debut"
 type="date"
 />
 <InfoCard
 icon={Calendar}
 label="Date fin prÃ©vue"
 value={new Date(chantier.date_fin_prevue).toLocaleDateString('fr-FR')}
 field="date_fin_prevue"
 type="date"
 />
 </div>
 </div>

 {/* Barre progression avancement */}
 <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center space-x-2">
 <TrendingUp className="w-5 h-5 text-blue-600" />
 <h3 className="text-lg font-semibold text-gray-900">Avancement global</h3>
 </div>
 <span className="text-2xl font-bold text-blue-600">{avancement}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
 <div
 className={`h-full transition-all duration-500 ${getScoreColor(avancement)}`}
 style={{ width: `${avancement}%` }}
 />
 </div>
 </div>

 {/* Score santÃ© par phase */}
 <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Score santÃ© par phase</h3>
 <div className="space-y-4">
 {phaseScores.map((phase) => (
 <div key={phase.phase}>
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-medium text-gray-700">{phase.phase}</span>
 <span className="text-sm text-gray-600">
 {phase.taches_terminees}/{phase.total_taches} tÃ¢ches â¢ {phase.score}%
 </span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
 <div
 className={`h-full transition-all duration-500 ${getScoreColor(phase.score)}`}
 style={{ width: `${phase.score}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* DerniÃ¨res entrÃ©es journal */}
 <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">
 DerniÃ¨res entrÃ©es du journal
 </h3>
 {recentEntries.length > 0 ? (
 <div className="space-y-3">
 {recentEntries.map((entry) => (
 <div
 key={entry.id}
 className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0"
 >
 <span className="text-xl">{getTypeIcon(entry.type)}</span>
 <div className="flex-1 min-w-0">
 <p className="text-sm text-gray-900 truncate">{entry.contenu}</p>
 <p className="text-xs text-gray-500 mt-1">
 {entry.auteur} â¢{' '}
 {new Date(entry.created_at).toLocaleDateString('fr-FR', {
 day: 'numeric',
 month: 'short',
 hour: '2-digit',
 minute: '2-digit',
 })}
 </p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-sm text-gray-500">Aucune entrÃ©e dans le journal</p>
 )}
 </div>

 {/* Alertes actives */}
 <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
 <div className="flex items-center space-x-2 mb-4">
 <AlertCircle className="w-5 h-5 text-red-600" />
 <h3 className="text-lg font-semibold text-gray-900">Alertes actives</h3>
 {activeAlerts.length > 0 && (
 <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">
 {activeAlerts.length}
 </span>
 )}
 </div>
 {activeAlerts.length > 0 ? (
 <div className="space-y-2">
 {activeAlerts.map((alert) => {
 const priorite = getPrioriteFromType(alert.type);
 return (
 <div
 key={alert.id}
 className={`p-3 rounded-lg border-l-4 ${
 priorite === 'Haute'
 ? 'bg-red-50 border-red-500'
 : priorite === 'Moyenne'
 ? 'bg-orange-50 border-orange-500'
 : 'bg-yellow-50 border-yellow-500'
 }`}
 >
 <p className="text-sm font-medium text-gray-900">{alert.titre}</p>
 <p className="text-xs text-gray-500 mt-1">
 {new Date(alert.created_at).toLocaleDateString('fr-FR')}
 </p>
 </div>
 );
 })}
 </div>
 ) : (
 <p className="text-sm text-gray-500">Aucune alerte active</p>
 )}
 </div>
 </div>
 );
};

export default ChantierOverview;