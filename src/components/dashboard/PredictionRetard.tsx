import React, { useMemo } from 'react';
import { AlertTriangle, TrendingDown, Calendar } from 'lucide-react';

interface Chantier {
 id: string;
 nom: string;
 client: string;
 phase: '\u00c9tudes' | 'Ex\u00e9cution' | 'OPR';
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
 // Mock data pour les t\u00e2ches
 const tachesTotales = 100;
 const tachesCompletes = Math.round((chantier.taux_avancement / 100) * tachesTotales);

 const dateDebut = new Date(chantier.date_debut);
 const dateFinPrevue = new Date(chantier.date_fin_prevue);
 const dateActuelle = new Date();

 // Jours \u00e9coul\u00e9s depuis le d\u00e9but
 const joursEcoules = Math.max(
 1,
 Math.floor((dateActuelle.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
 );

 // Jours totaux pr\u00e9vus
 const joursTotauxPrevus = Math.floor(
 (dateFinPrevue.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)
 );

 // V\u00e9locit\u00e9: t\u00e2ches compl\u00e9t\u00e9es par jour
 const velocite = tachesCompletes / joursEcoules;

 // T\u00e2ches restantes
 const tachesRestantes = tachesTotales - tachesCompletes;

 // Jours n\u00e9cessaires pour finir (\u00e0 la v\u00e9locit\u00e9 actuelle)
 const joursNecessaires = velocite > 0 ? Math.ceil(tachesRestantes / velocite) : Infinity;

 // Date de fin pr\u00e9dite
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
 <span className="text-sm text-gray-600">V\u00e9locit\u00e9</span>
 <span className="font-semibold text-gray-900">
 {prediction.velocite} t\u00e2ches/jour
 </span>
 </div>

 <div className="flex justify-between items-center">
 <span className="text-sm text-gray-600">T\u00e2ches</span>
 <span className="font-semibold text-gray-900">
 {prediction.tachesCompletes} / {prediction.tachesTotales}
 </span>
 </div>

 <div className="flex justify-between items-center">
 <span className="text-sm text-gray-600">Jours restants</span>
 <span className="font-semibold text-gray-900">
 {prediction.joursNecessaires === Infinity ? '\u221e' : prediction.joursNecessaires}
 </span>
 </div>

 <div className="pt-3 border-t border-gray-200">
 <div className="flex items-center justify-between">
 <div className="flex items-center">
 <Calendar className="w-4 h-4 mr-2 text-gray-600" />
 <span className="text-sm text-gray-600">Date fin pr\u00e9dite</span>
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
 Retard pr\u00e9dit: {prediction.joursRetard} jours
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