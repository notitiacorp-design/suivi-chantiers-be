import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import KPICard from '../components/dashboard/KPICard';
import HealthScoreGauge from '../components/dashboard/HealthScoreGauge';
import AlertPopup from '../components/dashboard/AlertPopup';
import ChantierMiniCard from '../components/dashboard/ChantierMiniCard';
import TrendChart from '../components/dashboard/TrendChart';
import ChargeChart from '../components/dashboard/ChargeChart';
import PredictionRetard from '../components/dashboard/PredictionRetard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';

interface Chantier {
 id: string;
 nom: string;
 client: string;
 phase: 'Ãtudes' | 'ExÃ©cution' | 'OPR';
 score_sante: number;
 taux_avancement: number;
 ca_responsable: string;
 date_debut: string;
 date_fin_prevue: string;
 budget_total: number;
}

interface Alert {
 id: string;
 chantier_id: string;
 chantier_nom: string;
 type: string;
 message: string;
 priorite: 'haute' | 'moyenne' | 'basse';
 date: string;
 lu: boolean;
}

interface KPIData {
 chantiers_actifs: number;
 score_moyen: number;
 alertes_en_cours: number;
 taux_avancement_moyen: number;
 variation_chantiers: number;
 variation_score: number;
 variation_alertes: number;
 variation_avancement: number;
}

const DashboardPage: React.FC = () => {
 const { user } = useAuth();
 const [kpiData, setKpiData] = useState<KPIData>({
 chantiers_actifs: 0,
 score_moyen: 0,
 alertes_en_cours: 0,
 taux_avancement_moyen: 0,
 variation_chantiers: 0,
 variation_score: 0,
 variation_alertes: 0,
 variation_avancement: 0,
 });
 const [chantiers, setChantiers] = useState<Chantier[]>([]);
 const [chantiersCritiques, setChantiersCritiques] = useState<Chantier[]>([]);
 const [alertes, setAlertes] = useState<Alert[]>([]);
 const [alertesNonLues, setAlertesNonLues] = useState<Alert[]>([]);
 const [showAlertPopup, setShowAlertPopup] = useState(false);
 const [loading, setLoading] = useState(true);

 // Mock data pour dÃ©monstration
 useEffect(() => {
 // Simuler le chargement des donnÃ©es
 setTimeout(() => {
 const mockChantiers: Chantier[] = [
 {
 id: '1',
 nom: 'Immeuble Lafayette',
 client: 'SCI Lafayette',
 phase: 'ExÃ©cution',
 score_sante: 35,
 taux_avancement: 45,
 ca_responsable: 'Jean Dupont',
 date_debut: '2024-01-15',
 date_fin_prevue: '2024-12-31',
 budget_total: 2500000,
 },
 {
 id: '2',
 nom: 'RÃ©novation MusÃ©e',
 client: 'Ville de Paris',
 phase: 'Ãtudes',
 score_sante: 78,
 taux_avancement: 20,
 ca_responsable: 'Marie Martin',
 date_debut: '2024-03-01',
 date_fin_prevue: '2025-06-30',
 budget_total: 5000000,
 },
 {
 id: '3',
 nom: 'Centre Commercial',
 client: 'KlÃ©pierre',
 phase: 'ExÃ©cution',
 score_sante: 42,
 taux_avancement: 67,
 ca_responsable: 'Jean Dupont',
 date_debut: '2023-09-01',
 date_fin_prevue: '2024-08-31',
 budget_total: 8000000,
 },
 {
 id: '4',
 nom: 'HÃ´pital Saint-Louis',
 client: 'AP-HP',
 phase: 'OPR',
 score_sante: 85,
 taux_avancement: 92,
 ca_responsable: 'Pierre Dubois',
 date_debut: '2023-01-15',
 date_fin_prevue: '2024-03-31',
 budget_total: 12000000,
 },
 {
 id: '5',
 nom: 'RÃ©sidence Ãtudiante',
 client: 'CROUS',
 phase: 'ExÃ©cution',
 score_sante: 62,
 taux_avancement: 55,
 ca_responsable: 'Marie Martin',
 date_debut: '2024-02-01',
 date_fin_prevue: '2024-11-30',
 budget_total: 3500000,
 },
 {
 id: '6',
 nom: 'Tour Montparnasse',
 client: 'Unibail',
 phase: 'Ãtudes',
 score_sante: 28,
 taux_avancement: 15,
 ca_responsable: 'Jean Dupont',
 date_debut: '2024-04-01',
 date_fin_prevue: '2026-12-31',
 budget_total: 15000000,
 },
 ];

 const mockAlertes: Alert[] = [
 {
 id: 'a1',
 chantier_id: '1',
 chantier_nom: 'Immeuble Lafayette',
 type: 'Retard',
 message: 'Retard de 15 jours sur le planning',
 priorite: 'haute',
 date: '2024-06-15T10:30:00',
 lu: false,
 },
 {
 id: 'a2',
 chantier_id: '3',
 chantier_nom: 'Centre Commercial',
 type: 'Budget',
 message: 'DÃ©passement budgÃ©taire prÃ©vu de 8%',
 priorite: 'haute',
 date: '2024-06-14T14:20:00',
 lu: false,
 },
 {
 id: 'a3',
 chantier_id: '6',
 chantier_nom: 'Tour Montparnasse',
 type: 'QualitÃ©',
 message: '3 non-conformitÃ©s dÃ©tectÃ©es',
 priorite: 'moyenne',
 date: '2024-06-13T09:15:00',
 lu: true,
 },
 {
 id: 'a4',
 chantier_id: '5',
 chantier_nom: 'RÃ©sidence Ãtudiante',
 type: 'SÃ©curitÃ©',
 message: 'Incident sÃ©curitÃ© mineur reportÃ©',
 priorite: 'moyenne',
 date: '2024-06-12T16:45:00',
 lu: true,
 },
 {
 id: 'a5',
 chantier_id: '1',
 chantier_nom: 'Immeuble Lafayette',
 type: 'Ressources',
 message: 'Manque de main d\'Åuvre spÃ©cialisÃ©e',
 priorite: 'haute',
 date: '2024-06-11T11:00:00',
 lu: false,
 },
 ];

 // Filtrer selon le rÃ´le
 let filteredChantiers = mockChantiers;
 if (user?.role === 'ca') {
 filteredChantiers = mockChantiers.filter(c => c.ca_responsable === user?.nom);
 }

 setChantiers(filteredChantiers);
 setChantiersCritiques(filteredChantiers.filter(c => c.score_sante < 50));
 setAlertes(mockAlertes);

 const alertesNonLuesFiltered = mockAlertes.filter(a => !a.lu);
 setAlertesNonLues(alertesNonLuesFiltered);

 // Calculer les KPI
 const scoresMoyens = filteredChantiers.map(c => c.score_sante);
 const scoreMoyen = scoresMoyens.length > 0 
 ? scoresMoyens.reduce((a, b) => a + b, 0) / scoresMoyens.length 
 : 0;

 const tauxAvancementMoyens = filteredChantiers.map(c => c.taux_avancement);
 const tauxAvancementMoyen = tauxAvancementMoyens.length > 0 
 ? tauxAvancementMoyens.reduce((a, b) => a + b, 0) / tauxAvancementMoyens.length 
 : 0;

 setKpiData({
 chantiers_actifs: filteredChantiers.length,
 score_moyen: Math.round(scoreMoyen),
 alertes_en_cours: alertesNonLuesFiltered.length,
 taux_avancement_moyen: Math.round(tauxAvancementMoyen),
 variation_chantiers: 12,
 variation_score: -5,
 variation_alertes: 8,
 variation_avancement: 3,
 });

 setLoading(false);

 // Afficher la popup d'alertes si non lues
 if (alertesNonLuesFiltered.length > 0) {
 setShowAlertPopup(true);
 }
 }, 500);
 }, [user]);

 const handleMarquerAlerteCommeRu = (alerteId: string) => {
 setAlertes(prev => prev.map(a => 
 a.id === alerteId ? { ...a, lu: true } : a
 ));
 setAlertesNonLues(prev => prev.filter(a => a.id !== alerteId));
 };

 const handleMarquerToutesCommeRu = () => {
 setAlertes(prev => prev.map(a => ({ ...a, lu: true })));
 setAlertesNonLues([]);
 setShowAlertPopup(false);
 };

 // DonnÃ©es pour le graphique de rÃ©partition par phase
 const phaseData = [
 { 
 name: 'Ãtudes', 
 value: chantiers.filter(c => c.phase === 'Ãtudes').length,
 color: '#3b82f6' 
 },
 { 
 name: 'ExÃ©cution', 
 value: chantiers.filter(c => c.phase === 'ExÃ©cution').length,
 color: '#8b5cf6' 
 },
 { 
 name: 'OPR', 
 value: chantiers.filter(c => c.phase === 'OPR').length,
 color: '#10b981' 
 },
 ];

 // DonnÃ©es pour le graphique des scores par chantier (triÃ© du plus bas au plus haut)
 const scoreData = [...chantiers]
 .sort((a, b) => a.score_sante - b.score_sante)
 .map(c => ({
 nom: c.nom.length > 15 ? c.nom.substring(0, 15) + '...' : c.nom,
 score: c.score_sante,
 fill: c.score_sante < 40 ? '#ef4444' : c.score_sante < 70 ? '#f97316' : '#10b981',
 }));

 if (loading) {
 return (
 <div className="flex items-center justify-center h-screen bg-gray-50">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-gray-50 p-6">
 {/* Header */}
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-gray-900">
 Tableau de bord
 </h1>
 <p className="text-gray-600 mt-2">
 Bienvenue {user?.nom} - {user?.role === 'directeur' ? 'Directeur' : 'Chef d\'Affaires'}
 </p>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <KPICard
 title="Chantiers actifs"
 value={kpiData.chantiers_actifs}
 variation={kpiData.variation_chantiers}
 icon={<Activity className="w-6 h-6" />}
 color="blue"
 />
 <KPICard
 title="Score moyen santÃ©"
 value={kpiData.score_moyen}
 variation={kpiData.variation_score}
 icon={<TrendingUp className="w-6 h-6" />}
 color={kpiData.score_moyen < 50 ? 'red' : kpiData.score_moyen < 70 ? 'orange' : 'green'}
 suffix="/100"
 />
 <KPICard
 title="Alertes en cours"
 value={kpiData.alertes_en_cours}
 variation={kpiData.variation_alertes}
 icon={<AlertTriangle className="w-6 h-6" />}
 color="red"
 />
 <KPICard
 title="Avancement moyen"
 value={kpiData.taux_avancement_moyen}
 variation={kpiData.variation_avancement}
 icon={<CheckCircle className="w-6 h-6" />}
 color="green"
 suffix="%"
 />
 </div>

 {/* Chantiers Critiques */}
 {chantiersCritiques.length > 0 && (
 <div className="mb-8">
 <div className="flex items-center mb-4">
 <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
 <h2 className="text-2xl font-bold text-gray-900">
 Chantiers critiques ({chantiersCritiques.length})
 </h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {chantiersCritiques.map(chantier => (
 <ChantierMiniCard key={chantier.id} chantier={chantier} />
 ))}
 </div>
 </div>
 )}

 {/* Alertes rÃ©centes */}
 <div className="bg-white rounded-lg shadow-md p-6 mb-8">
 <h2 className="text-2xl font-bold text-gray-900 mb-4">
 Alertes rÃ©centes
 </h2>
 <div className="space-y-3">
 {alertes.slice(0, 5).map(alerte => (
 <div
 key={alerte.id}
 className={`p-4 rounded-lg border-l-4 ${
 alerte.priorite === 'haute'
 ? 'border-red-500 bg-red-50'
 : alerte.priorite === 'moyenne'
 ? 'border-orange-500 bg-orange-50'
 : 'border-yellow-500 bg-yellow-50'
 } ${alerte.lu ? 'opacity-60' : ''}`}
 >
 <div className="flex justify-between items-start">
 <div className="flex-1">
 <div className="flex items-center">
 <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
 alerte.priorite === 'haute'
 ? 'bg-red-200 text-red-800'
 : alerte.priorite === 'moyenne'
 ? 'bg-orange-200 text-orange-800'
 : 'bg-yellow-200 text-yellow-800'
 }`}>
 {alerte.priorite.toUpperCase()}
 </span>
 <span className="ml-2 text-sm text-gray-600">{alerte.type}</span>
 </div>
 <p className="font-semibold text-gray-900 mt-2">{alerte.chantier_nom}</p>
 <p className="text-gray-700 mt-1">{alerte.message}</p>
 <p className="text-xs text-gray-500 mt-2">
 {new Date(alerte.date).toLocaleDateString('fr-FR', {
 day: 'numeric',
 month: 'long',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 })}
 </p>
 </div>
 {!alerte.lu && (
 <button
 onClick={() => handleMarquerAlerteCommeRu(alerte.id)}
 className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
 >
 Marquer lu
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Graphiques */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
 {/* RÃ©partition par phase */}
 <div className="bg-white rounded-lg shadow-md p-6">
 <h3 className="text-xl font-bold text-gray-900 mb-4">
 RÃ©partition par phase
 </h3>
 <ResponsiveContainer width="100%" height={300}>
 <PieChart>
 <Pie
 data={phaseData}
 cx="50%"
 cy="50%"
 labelLine={false}
 label={({ name, value }) => `${name}: ${value}`}
 outerRadius={100}
 fill="#8884d8"
 dataKey="value"
 >
 {phaseData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip />
 </PieChart>
 </ResponsiveContainer>
 </div>

 {/* Score santÃ© par chantier */}
 <div className="bg-white rounded-lg shadow-md p-6">
 <h3 className="text-xl font-bold text-gray-900 mb-4">
 Score santÃ© par chantier
 </h3>
 <ResponsiveContainer width="100%" height={300}>
 <BarChart data={scoreData} layout="vertical">
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis type="number" domain={[0, 100]} />
 <YAxis type="category" dataKey="nom" width={120} />
 <Tooltip />
 <Bar dataKey="score" fill="#8884d8" />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Tendance des scores */}
 <div className="bg-white rounded-lg shadow-md p-6 mb-8">
 <TrendChart chantierId={chantiers[0]?.id || null} />
 </div>

 {/* PrÃ©dictions de retard */}
 {chantiersCritiques.length > 0 && (
 <div className="bg-white rounded-lg shadow-md p-6 mb-8">
 <h3 className="text-xl font-bold text-gray-900 mb-4">
 PrÃ©dictions de retard
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {chantiersCritiques.map(chantier => (
 <PredictionRetard key={chantier.id} chantier={chantier} />
 ))}
 </div>
 </div>
 )}

 {/* Graphique de charge (uniquement pour directeur) */}
 {user?.role === 'directeur' && (
 <div className="bg-white rounded-lg shadow-md p-6">
 <ChargeChart />
 </div>
 )}

 {/* Popup d'alertes */}
 {showAlertPopup && alertesNonLues.length > 0 && (
 <AlertPopup
 alertes={alertesNonLues}
 onClose={() => setShowAlertPopup(false)}
 onMarquerCommeRu={handleMarquerAlerteCommeRu}
 onMarquerToutesCommeRu={handleMarquerToutesCommeRu}
 />
 )}
 </div>
 );
};

export default DashboardPage;