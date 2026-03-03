import React from 'react';
import { useNavigate } from 'react-router-dom';
import HealthScoreGauge from './HealthScoreGauge';
import { MapPin, User } from 'lucide-react';

interface Chantier {
 id: string;
 nom: string;
 client: string;
 phase: string;
 health_score?: number;
 score_sante?: number;
 avancement_physique?: number;
 taux_avancement?: number;
 ca_responsable?: string;
}

interface ChantierMiniCardProps {
 chantier: Chantier;
}

const ChantierMiniCard: React.FC<ChantierMiniCardProps> = ({ chantier }) => {
 const navigate = useNavigate();

 const getBorderColor = (score: number): string => {
 if (score < 40) return 'border-red-500';
 if (score < 70) return 'border-orange-500';
 return 'border-green-500';
 };

 const getPhaseColor = (phase: string): string => {
 switch (phase) {
 case 'Études':
 return 'bg-blue-100 text-blue-800';
 case 'Exécution':
 return 'bg-purple-100 text-purple-800';
 case 'OPR':
 return 'bg-green-100 text-green-800';
 default:
 return 'bg-gray-100 text-gray-800';
 }
 };

 const scoreSante = chantier.health_score ?? chantier.score_sante ?? 0;
 const tauxAvancement = chantier.avancement_physique ?? chantier.taux_avancement ?? 0;
 const phaseLabel = chantier.phase ? chantier.phase.charAt(0).toUpperCase() + chantier.phase.slice(1) : 'Non défini';

 return (
 <div
 onClick={() => navigate(`/chantiers/${chantier.id}`)}
 className={`
 bg-white rounded-lg shadow-md p-4 border-l-4 ${getBorderColor(scoreSante)}
 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1
 `}
 >
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <h3 className="font-bold text-gray-900 text-lg mb-1">
 {chantier.nom}
 </h3>
 <div className="flex items-center text-sm text-gray-600 mb-2">
 <MapPin className="w-4 h-4 mr-1" />
 <span>{chantier.client}</span>
 </div>
 </div>
 <div className="ml-3">
 <HealthScoreGauge score={scoreSante} size="small" showLabel={false} />
 </div>
 </div>

 <div className="flex items-center justify-between">
 <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPhaseColor(phaseLabel)}`}>
 {phaseLabel}
 </span>
 <div className="flex items-center text-sm text-gray-600">
 <User className="w-4 h-4 mr-1" />
 <span>{chantier.ca_responsable || "—"}</span>
 </div>
 </div>

 <div className="mt-3 pt-3 border-t border-gray-200">
 <div className="flex justify-between items-center text-sm">
 <span className="text-gray-600">Avancement</span>
 <span className="font-semibold text-gray-900">{tauxAvancement}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
 <div
 className="bg-blue-600 h-2 rounded-full transition-all"
 style={{ width: `${tauxAvancement}%` }}
 ></div>
 </div>
 </div>
 </div>
 );
};

export default ChantierMiniCard;