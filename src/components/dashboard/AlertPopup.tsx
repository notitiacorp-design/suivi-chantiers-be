import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

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

interface AlertPopupProps {
 alertes: Alert[];
 onClose: () => void;
 onMarquerCommeRu: (alerteId: string) => void;
 onMarquerToutesCommeRu: () => void;
}

const AlertPopup: React.FC<AlertPopupProps> = ({
 alertes,
 onClose,
 onMarquerCommeRu,
 onMarquerToutesCommeRu,
}) => {
 useEffect(() => {
 // Empêcher le scroll du body quand la modal est ouverte
 document.body.style.overflow = 'hidden';
 return () => {
 document.body.style.overflow = 'unset';
 };
 }, []);

 // Trier les alertes par priorité (haute d'abord)
 const alertesSorted = [...alertes].sort((a, b) => {
 const priorityOrder = { haute: 0, moyenne: 1, basse: 2 };
 return priorityOrder[a.priorite] - priorityOrder[b.priorite];
 });

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
 <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-slideUp">
 {/* Header */}
 <div className="bg-red-600 text-white p-6 flex items-center justify-between">
 <div className="flex items-center">
 <AlertTriangle className="w-6 h-6 mr-3" />
 <div>
 <h2 className="text-2xl font-bold">
 Alertes non lues ({alertes.length})
 </h2>
 <p className="text-red-100 text-sm mt-1">
 Vous avez de nouvelles alertes importantes
 </p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-2 hover:bg-red-700 rounded-full transition"
 >
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Liste des alertes */}
 <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
 <div className="space-y-4">
 {alertesSorted.map((alerte) => (
 <div
 key={alerte.id}
 className={`p-4 rounded-lg border-l-4 ${
 alerte.priorite === 'haute'
 ? 'border-red-500 bg-red-50'
 : alerte.priorite === 'moyenne'
 ? 'border-orange-500 bg-orange-50'
 : 'border-yellow-500 bg-yellow-50'
 }`}
 >
 <div className="flex justify-between items-start">
 <div className="flex-1">
 <div className="flex items-center mb-2">
 <span
 className={`px-2 py-1 text-xs font-semibold rounded-full ${
 alerte.priorite === 'haute'
 ? 'bg-red-200 text-red-800'
 : alerte.priorite === 'moyenne'
 ? 'bg-orange-200 text-orange-800'
 : 'bg-yellow-200 text-yellow-800'
 }`}
 >
 {alerte.priorite.toUpperCase()}
 </span>
 <span className="ml-2 text-sm text-gray-600 font-medium">
 {alerte.type}
 </span>
 </div>
 <p className="font-bold text-gray-900 mb-1">
 {alerte.chantier_nom}
 </p>
 <p className="text-gray-700">{alerte.message}</p>
 <p className="text-xs text-gray-500 mt-2">
 {new Date(alerte.date).toLocaleDateString('fr-FR', {
 day: 'numeric',
 month: 'long',
 hour: '2-digit',
 minute: '2-digit',
 })}
 </p>
 </div>
 <button
 onClick={() => onMarquerCommeRu(alerte.id)}
 className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition flex-shrink-0"
 >
 Marquer lu
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Footer */}
 <div className="bg-gray-50 p-4 flex justify-between items-center border-t">
 <p className="text-sm text-gray-600">
 Ces alertes nécessitent votre attention
 </p>
 <div className="flex space-x-3">
 <button
 onClick={onClose}
 className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition"
 >
 Fermer
 </button>
 <button
 onClick={onMarquerToutesCommeRu}
 className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
 >
 Tout marquer comme lu
 </button>
 </div>
 </div>
 </div>
 </div>
 );
};

export default AlertPopup;