import React, { useMemo } from 'react';
import { AlertTriangle, TrendingDown, Calendar } from 'lucide-react';

interface Chantier {
 id: string;
 nom: string;
 client: string;
 phase: 'Études' | 'Exécution' | 'OPR';
 score_sante: number;
 taux_avancement: number;
 ca_responsable: string;
 date_debut: string;
 date_fin_prevue: string;
 budget_total: number;
}

interface PredictionRetardProps {
 chantier: Chantier;
}

const PredictionRetard: React.FC<PredictionRetardProps> = ({ chantier }) => {
 const prediction = useMemo(() => {
 // Mock data pour les tâches
 const tachesTotales = 100;
 const tachesCompletes = Math.round((chantier.taux_avancement / 100) * tachesTotales);

 const dateDebut = new Date(chantier.date_debut);
 const dateFinPrevue = new Date(chantier.date_fin_prevue);
 const dateActuelle = new Date();

 // Jours écoulés depuis le début
 const joursEcoules = Math.max(
 1,
 Math.floor((dateActuelle.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
 );

 // Jours totaux prévus
 const joursTotauxPrevus = Math.floor(
 (dateFinPrevue.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)
 );

 // Vélocité: tâches complétées par jour
 const velocite = tachesCompletes / joursEcoules;

 // Tâches restantes
 const tachesRestantes = tachesTotales - tachesCompletes;

 // Jours nécessaires pour finir (à la vélocité actuelle)
 const joursNecessaires = velocite > 0 ? Math.ceil(tachesRestantes / velocite) : Infinity;

 // Date de fin prédite
 const dateFinPredite = new Date(dateActuelle);
 dateFinPredite.setDate(dateFinPredite.getDate() + joursNecessaires);

 // Retard en jours
 const joursRetard = Math.floor(
 (dateFinPredite.getTime() - dateFinPrevue.getTime()) / (1000 * 60 * 60 * 24)
 );

 return {
 velocite: velocite.toFixed(2),
 joursNecessaires,
 dateFinPredite: dateFinPredite.toLocaleDateString('fr-FR'),
 joursRetard: Math.max(0, joursRetard),
 enRetard: joursRetard > 0,
 tachesCompletes,
 tachesTotales,
 };
 }, [chantier]);

 const getColorClass = () => {
 if (!prediction.enRetard) return 'border-green-500 bg-green-50';
 if (prediction.joursRetard < 7) return 'border-orange-500 bg-orange-50';
 return 'border-red-500 bg-red-50';
 };

 return (
 <div className={`p-4 rounded-lg border-l-4 ${getColorClass()}`}>
 <h4 className="font-bold text-gray-900 mb-3 flex items-center">
 <TrendingDown className="w-5 h-5 mr-2" />
 {chantier.nom}
 </h4>

 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-sm text-gray-600">Vélocité</span>
 <span className="font-semibold text-gray-900">
 {prediction.velocite} tâches/jour
 </span>
 </div>

 <div className="flex justify-between items-center">
 <span className="text-sm text-gray-600">Tâches</span>
 <span className="font-semibold text-gray-900">
 {prediction.tachesCompletes} / {prediction.tachesTotales}
 </span>
 </div>

 <div className="flex justify-between items-center">
 <span className="text-sm text-gray-600">Jours restants</span>
 <span className="font-semibold text-gray-900">
 {prediction.joursNecessaires === Infinity ? '∞' : prediction.joursNecessaires}
 </span>
 </div>

 <div className="pt-3 border-t border-gray-200">
 <div className="flex items-center justify-between">
 <div className="flex items-center">
 <Calendar className="w-4 h-4 mr-2 text-gray-600" />
 <span className="text-sm text-gray-600">Date fin prédite</span>
 </div>
 <span className="font-semibold text-gray-900">
 {prediction.dateFinPredite}
 </span>
 </div>
 </div>

 {prediction.enRetard && (
 <div className="flex items-center justify-center p-3 bg-red-100 rounded-lg">
 <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
 <span className="font-bold text-red-600">
 Retard prédit: {prediction.joursRetard} jours
 </span>
 </div>
 )}

 {!prediction.enRetard && (
 <div className="flex items-center justify-center p-3 bg-green-100 rounded-lg">
 <span className="font-semibold text-green-600">Dans les temps</span>
 </div>
 )}
 </div>
 </div>
 );
};

export default PredictionRetard;