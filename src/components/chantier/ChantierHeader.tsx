import React, { useState } from 'react';
import { ChevronDown, FileText, Archive, Edit2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Chantier {
 id: string;
 nom: string;
 client: string;
 phase_actuelle: string;
 statut: string;
 score_sante: number;
}

interface ChantierHeaderProps {
 chantier: Chantier;
 onUpdate: (updates: Partial<Chantier>) => void;
 onExportPDF: () => void;
 onArchive: () => void;
}

const ChantierHeader: React.FC<ChantierHeaderProps> = ({
 chantier,
 onUpdate,
 onExportPDF,
 onArchive,
}) => {
 const navigate = useNavigate();
 const [showActions, setShowActions] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [editedNom, setEditedNom] = useState(chantier.nom);

 const getScoreColor = (score: number) => {
 if (score >= 80) return 'text-green-600';
 if (score >= 60) return 'text-yellow-600';
 if (score >= 40) return 'text-orange-600';
 return 'text-red-600';
 };

 const getScoreBgColor = (score: number) => {
 if (score >= 80) return 'bg-green-100';
 if (score >= 60) return 'bg-yellow-100';
 if (score >= 40) return 'bg-orange-100';
 return 'bg-red-100';
 };

 const handleSaveNom = () => {
 if (editedNom.trim() && editedNom !== chantier.nom) {
 onUpdate({ nom: editedNom.trim() });
 }
 setIsEditing(false);
 };

 const getStatutBadgeClass = (statut: string) => {
 const classes: Record<string, string> = {
 'En cours': 'bg-blue-100 text-blue-800',
 'En attente': 'bg-yellow-100 text-yellow-800',
 'Terminé': 'bg-green-100 text-green-800',
 'Bloqué': 'bg-red-100 text-red-800',
 'Archivé': 'bg-gray-100 text-gray-800',
 };
 return classes[statut] || 'bg-gray-100 text-gray-800';
 };

 return (
 <div className="bg-white border-b border-gray-200 shadow-sm">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-4 flex-1">
 <button
 onClick={() => navigate('/chantiers')}
 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
 title="Retour aux chantiers"
 >
 <ArrowLeft className="w-5 h-5 text-gray-600" />
 </button>

 <div className="flex-1">
 {isEditing ? (
 <div className="flex items-center space-x-2">
 <input
 type="text"
 value={editedNom}
 onChange={(e) => setEditedNom(e.target.value)}
 onBlur={handleSaveNom}
 onKeyDown={(e) => {
 if (e.key === 'Enter') handleSaveNom();
 if (e.key === 'Escape') {
 setEditedNom(chantier.nom);
 setIsEditing(false);
 }
 }}
 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-600 focus:outline-none"
 autoFocus
 />
 </div>
 ) : (
 <div className="flex items-center space-x-3">
 <h1 className="text-2xl font-bold text-gray-900">{chantier.nom}</h1>
 <button
 onClick={() => setIsEditing(true)}
 className="p-1 hover:bg-gray-100 rounded"
 title="Modifier le nom"
 >
 <Edit2 className="w-4 h-4 text-gray-400" />
 </button>
 </div>
 )}
 <div className="flex items-center space-x-4 mt-2">
 <p className="text-sm text-gray-600">
 <span className="font-medium">Client:</span> {chantier.client}
 </p>
 <span className="text-gray-300">•</span>
 <p className="text-sm text-gray-600">
 <span className="font-medium">Phase:</span> {chantier.phase_actuelle}
 </p>
 <span className="text-gray-300">•</span>
 <span
 className={`px-3 py-1 rounded-full text-xs font-medium ${
 getStatutBadgeClass(chantier.statut)
 }`}
 >
 {chantier.statut}
 </span>
 </div>
 </div>
 </div>

 <div className="flex items-center space-x-4">
 {/* Score santé mini gauge */}
 <div className="flex items-center space-x-3">
 <div className="text-right">
 <p className="text-xs text-gray-500">Score santé</p>
 <p className={`text-2xl font-bold ${getScoreColor(chantier.score_sante)}`}>
 {chantier.score_sante}%
 </p>
 </div>
 <div className="relative w-16 h-16">
 <svg className="w-16 h-16 transform -rotate-90">
 <circle
 cx="32"
 cy="32"
 r="28"
 stroke="currentColor"
 strokeWidth="6"
 fill="none"
 className="text-gray-200"
 />
 <circle
 cx="32"
 cy="32"
 r="28"
 stroke="currentColor"
 strokeWidth="6"
 fill="none"
 strokeDasharray={`${2 * Math.PI * 28}`}
 strokeDashoffset={`${2 * Math.PI * 28 * (1 - chantier.score_sante / 100)}`}
 className={getScoreColor(chantier.score_sante)}
 strokeLinecap="round"
 />
 </svg>
 </div>
 </div>

 {/* Actions dropdown */}
 <div className="relative">
 <button
 onClick={() => setShowActions(!showActions)}
 className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
 >
 <span>Actions</span>
 <ChevronDown className="w-4 h-4" />
 </button>
 {showActions && (
 <>
 <div
 className="fixed inset-0 z-10"
 onClick={() => setShowActions(false)}
 />
 <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
 <button
 onClick={() => {
 onExportPDF();
 setShowActions(false);
 }}
 className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
 >
 <FileText className="w-4 h-4" />
 <span>Exporter PDF</span>
 </button>
 <button
 onClick={() => {
 onArchive();
 setShowActions(false);
 }}
 className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
 >
 <Archive className="w-4 h-4" />
 <span>Archiver</span>
 </button>
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default ChantierHeader;