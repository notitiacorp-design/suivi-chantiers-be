import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
 Search,
 Filter,
 Download,
 Plus,
 ChevronDown,
 ChevronUp,
 Grid,
 List,
 Calendar,
 User,
 TrendingUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import NewChantierForm from '../components/chantier/NewChantierForm';

interface Chantier {
 id: string;
 nom: string;
 client: string;
 phase: string;
 health_score: number;
 charge_affaires_nom: string;
 charge_affaires_prenom: string;
 avancement_physique: number;
 statut: string;
 date_fin_prevue: string;
 budget_initial: number;
 heures_prevues: number;
}

type SortField = 'nom' | 'client' | 'phase' | 'health_score' | 'avancement_physique' | 'date_fin_prevue';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

interface ChantiersListPageProps {
 filterMine?: boolean;
}

const ChantiersListPage: React.FC<ChantiersListPageProps> = ({ filterMine = false }) => {
 const navigate = useNavigate();
 const [searchTerm, setSearchTerm] = useState('');
 const [phaseFilter, setPhaseFilter] = useState<string>('all');
 const [statutFilter, setStatutFilter] = useState<string>('all');
 const [caFilter, setCaFilter] = useState<string>('all');
 const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
 const [sortField, setSortField] = useState<SortField>('nom');
 const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
 const [viewMode, setViewMode] = useState<ViewMode>('table');
 const [currentPage, setCurrentPage] = useState(1);
 const [showNewChantierForm, setShowNewChantierForm] = useState(false);
 const itemsPerPage = 20;

 // Récupération des chantiers avec jointures
 const { data: chantiers = [], isLoading, refetch } = useQuery({
 queryKey: ['chantiers-list'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('chantiers')
 .select(`
 *,
 charge_affaires:profiles!charge_affaires_id(nom, prenom)
 `)
 .order('created_at', { ascending: false });

 if (error) throw error;

 return (data || []).map((c: any) => ({
 id: c.id,
 nom: c.nom,
 client: c.client || 'N/A',
 phase: c.phase || 'N/A',
 health_score: c.health_score || 0,
 charge_affaires_nom: c.charge_affaires?.nom || '',
 charge_affaires_prenom: c.charge_affaires?.prenom || '',
 avancement_physique: c.avancement_physique || 0,
 statut: c.statut || 'en_cours',
 date_fin_prevue: c.date_fin_prevue || '',
 budget_initial: c.budget_initial || 0,
 heures_prevues: c.heures_prevues || 0,
 })) as Chantier[];
 },
 });

 // Liste unique des chargés d'affaires
 const chargesAffaires = useMemo(() => {
 const unique = new Set<string>();
 chantiers.forEach((c) => {
 if (c.charge_affaires_nom) {
 unique.add(`${c.charge_affaires_prenom} ${c.charge_affaires_nom}`);
 }
 });
 return Array.from(unique).sort();
 }, [chantiers]);

 // Filtrage et tri
 const chantiersFiltered = useMemo(() => {
 let filtered = chantiers;

 // Recherche full-text
 if (searchTerm) {
 const search = searchTerm.toLowerCase();
 filtered = filtered.filter(
 (c) =>
 c.nom.toLowerCase().includes(search) ||
 c.client.toLowerCase().includes(search) ||
 `${c.charge_affaires_prenom} ${c.charge_affaires_nom}`.toLowerCase().includes(search)
 );
 }

 // Filtres
 if (phaseFilter !== 'all') {
 filtered = filtered.filter((c) => c.phase === phaseFilter);
 }
 if (statutFilter !== 'all') {
 filtered = filtered.filter((c) => c.statut === statutFilter);
 }
 if (caFilter !== 'all') {
 filtered = filtered.filter(
 (c) => `${c.charge_affaires_prenom} ${c.charge_affaires_nom}` === caFilter
 );
 }
 filtered = filtered.filter(
 (c) => c.health_score >= scoreRange[0] && c.health_score <= scoreRange[1]
 );

 // Tri
 filtered.sort((a, b) => {
 let aVal: any = a[sortField];
 let bVal: any = b[sortField];

 if (sortField === 'date_fin_prevue') {
 aVal = new Date(aVal).getTime();
 bVal = new Date(bVal).getTime();
 }

 if (typeof aVal === 'string') {
 return sortOrder === 'asc'
 ? aVal.localeCompare(bVal)
 : bVal.localeCompare(aVal);
 }

 return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
 });

 return filtered;
 }, [chantiers, searchTerm, phaseFilter, statutFilter, caFilter, scoreRange, sortField, sortOrder]);

 // Pagination
 const totalPages = Math.ceil(chantiersFiltered.length / itemsPerPage);
 const chantiersPaginated = chantiersFiltered.slice(
 (currentPage - 1) * itemsPerPage,
 currentPage * itemsPerPage
 );

 const handleSort = (field: SortField) => {
 if (sortField === field) {
 setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
 } else {
 setSortField(field);
 setSortOrder('asc');
 }
 };

 const exportToExcel = () => {
 const dataToExport = chantiersFiltered.map((c) => ({
 ID: c.id,
 Nom: c.nom,
 Client: c.client,
 Phase: c.phase,
 'Score Santé': c.health_score,
 'Chargé Affaires': `${c.charge_affaires_prenom} ${c.charge_affaires_nom}`,
 'Avancement (%)': c.avancement_physique,
 Statut: c.statut,
 'Date Fin Prévue': c.date_fin_prevue,
 'Budget Initial': c.budget_initial,
 'Heures Prévues': c.heures_prevues,
 }));

 const ws = XLSX.utils.json_to_sheet(dataToExport);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Chantiers');
 XLSX.writeFile(wb, `chantiers_${new Date().toISOString().split('T')[0]}.xlsx`);
 };

 const getScoreColor = (score: number) => {
 if (score >= 80) return 'text-green-600 bg-green-100';
 if (score >= 50) return 'text-orange-600 bg-orange-100';
 return 'text-red-600 bg-red-100';
 };

 const getStatutBadge = (statut: string) => {
 const colors: Record<string, string> = {
 en_cours: 'bg-green-100 text-green-800',
 en_attente: 'bg-yellow-100 text-yellow-800',
 termine: 'bg-blue-100 text-blue-800',
 suspendu: 'bg-orange-100 text-orange-800',
 annule: 'bg-red-100 text-red-800',
 };
 return colors[statut] || 'bg-gray-100 text-gray-800';
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center h-screen">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
 {/* En-tête */}
 <div className="bg-white rounded-lg shadow-md p-6">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
 <List className="w-8 h-8 text-blue-600" />
 Liste des Chantiers
 </h1>
 <p className="text-gray-600 mt-1">Gestion et suivi de tous les chantiers</p>
 </div>
 <button
 onClick={() => setShowNewChantierForm(true)}
 className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2"
 >
 <Plus className="w-5 h-5" />
 Nouveau Chantier
 </button>
 </div>

 {/* Statistiques rapides */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
 <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
 <p className="text-sm text-blue-600 font-medium">Total chantiers</p>
 <p className="text-2xl font-bold text-blue-900">{chantiers.length}</p>
 </div>
 <div className="bg-green-50 rounded-lg p-4 border border-green-200">
 <p className="text-sm text-green-600 font-medium">En cours</p>
 <p className="text-2xl font-bold text-green-900">
 {chantiers.filter((c) => c.statut === 'en_cours').length}
 </p>
 </div>
 <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
 <p className="text-sm text-orange-600 font-medium">Score moyen</p>
 <p className="text-2xl font-bold text-orange-900">
 {Math.round(
 chantiers.reduce((sum, c) => sum + c.health_score, 0) / chantiers.length || 0
 )}
 </p>
 </div>
 <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
 <p className="text-sm text-purple-600 font-medium">Avancement moyen</p>
 <p className="text-2xl font-bold text-purple-900">
 {Math.round(
 chantiers.reduce((sum, c) => sum + c.avancement_physique, 0) / chantiers.length || 0
 )}%
 </p>
 </div>
 </div>

 {/* Barre de recherche et filtres */}
 <div className="space-y-4">
 <div className="flex flex-col md:flex-row gap-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
 <input
 type="text"
 placeholder="Rechercher par nom, client, chargé d'affaires..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
 className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
 >
 {viewMode === 'table' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
 </button>
 <button
 onClick={exportToExcel}
 className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
 >
 <Download className="w-5 h-5" />
 Export Excel
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <select
 value={phaseFilter}
 onChange={(e) => setPhaseFilter(e.target.value)}
 className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="all">Toutes les phases</option>
 <option value="etude">Étude</option>
 <option value="preparation">Préparation</option>
 <option value="execution">Exécution</option>
 <option value="reception">Réception</option>
 <option value="garantie">Garantie</option>
 </select>

 <select
 value={statutFilter}
 onChange={(e) => setStatutFilter(e.target.value)}
 className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="all">Tous les statuts</option>
 <option value="en_attente">En attente</option>
 <option value="en_cours">En cours</option>
 <option value="termine">Terminé</option>
 <option value="suspendu">Suspendu</option>
 <option value="annule">Annulé</option>
 </select>

 <select
 value={caFilter}
 onChange={(e) => setCaFilter(e.target.value)}
 className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="all">Tous les CA</option>
 {chargesAffaires.map((ca) => (
 <option key={ca} value={ca}>
 {ca}
 </option>
 ))}
 </select>

 <div className="flex items-center gap-2">
 <label className="text-sm text-gray-700 whitespace-nowrap">Score santé:</label>
 <input
 type="range"
 min="0"
 max="100"
 value={scoreRange[0]}
 onChange={(e) => setScoreRange([Number(e.target.value), scoreRange[1]])}
 className="flex-1"
 />
 <input
 type="range"
 min="0"
 max="100"
 value={scoreRange[1]}
 onChange={(e) => setScoreRange([scoreRange[0], Number(e.target.value)])}
 className="flex-1"
 />
 <span className="text-sm text-gray-700 whitespace-nowrap">
 {scoreRange[0]}-{scoreRange[1]}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Résultats */}
 {viewMode === 'table' ? (
 <div className="bg-white rounded-lg shadow-md overflow-hidden">
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-100">
 <tr>
 <th
 onClick={() => handleSort('nom')}
 className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
 >
 <div className="flex items-center gap-2">
 Nom du chantier
 {sortField === 'nom' &&
 (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
 </div>
 </th>
 <th
 onClick={() => handleSort('client')}
 className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
 >
 <div className="flex items-center gap-2">
 Client
 {sortField === 'client' &&
 (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
 </div>
 </th>
 <th
 onClick={() => handleSort('phase')}
 className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
 >
 <div className="flex items-center gap-2">
 Phase
 {sortField === 'phase' &&
 (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
 </div>
 </th>
 <th
 onClick={() => handleSort('health_score')}
 className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
 >
 <div className="flex items-center justify-center gap-2">
 Score Santé
 {sortField === 'health_score' &&
 (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
 </div>
 </th>
 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
 Chargé d'Affaires
 </th>
 <th
 onClick={() => handleSort('avancement_physique')}
 className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
 >
 <div className="flex items-center justify-center gap-2">
 Avancement
 {sortField === 'avancement_physique' &&
 (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
 </div>
 </th>
 <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
 Statut
 </th>
 <th
 onClick={() => handleSort('date_fin_prevue')}
 className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
 >
 <div className="flex items-center justify-center gap-2">
 Date Fin Prévue
 {sortField === 'date_fin_prevue' &&
 (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
 </div>
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {chantiersPaginated.map((chantier) => (
 <tr
 key={chantier.id}
 onClick={() => navigate(`/chantiers/${chantier.id}`)}
 className="hover:bg-gray-50 cursor-pointer transition-colors"
 >
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm font-medium text-gray-900">{chantier.nom}</div>
 <div className="text-xs text-gray-500">ID: {chantier.id.slice(0, 8)}</div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{chantier.client}</td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
 {chantier.phase}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center justify-center gap-2">
 <div className="w-16 bg-gray-200 rounded-full h-2">
 <div
 className={`h-2 rounded-full ${
 chantier.health_score >= 80
 ? 'bg-green-500'
 : chantier.health_score >= 50
 ? 'bg-orange-500'
 : 'bg-red-500'
 }`}
 style={{ width: `${chantier.health_score}%` }}
 ></div>
 </div>
 <span className={`text-sm font-semibold ${getScoreColor(chantier.health_score)}`}>
 {chantier.health_score}
 </span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
 {chantier.charge_affaires_prenom} {chantier.charge_affaires_nom}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center justify-center gap-2">
 <div className="w-20 bg-gray-200 rounded-full h-2">
 <div
 className="bg-blue-600 h-2 rounded-full"
 style={{ width: `${chantier.avancement_physique}%` }}
 ></div>
 </div>
 <span className="text-sm font-medium text-gray-700">{chantier.avancement_physique}%</span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <span
 className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatutBadge(
 chantier.statut
 )}`}
 >
 {chantier.statut}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
 {chantier.date_fin_prevue
 ? new Date(chantier.date_fin_prevue).toLocaleDateString('fr-FR')
 : 'N/A'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
 <div className="text-sm text-gray-700">
 Affichage de {(currentPage - 1) * itemsPerPage + 1} à{' '}
 {Math.min(currentPage * itemsPerPage, chantiersFiltered.length)} sur{' '}
 {chantiersFiltered.length} résultats
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
 disabled={currentPage === 1}
 className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
 >
 Précédent
 </button>
 <div className="flex gap-1">
 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
 let pageNum;
 if (totalPages <= 5) {
 pageNum = i + 1;
 } else if (currentPage <= 3) {
 pageNum = i + 1;
 } else if (currentPage >= totalPages - 2) {
 pageNum = totalPages - 4 + i;
 } else {
 pageNum = currentPage - 2 + i;
 }
 return (
 <button
 key={pageNum}
 onClick={() => setCurrentPage(pageNum)}
 className={`px-3 py-2 rounded-lg ${
 currentPage === pageNum
 ? 'bg-blue-600 text-white'
 : 'border border-gray-300 hover:bg-gray-100'
 }`}
 >
 {pageNum}
 </button>
 );
 })}
 </div>
 <button
 onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
 disabled={currentPage === totalPages}
 className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
 >
 Suivant
 </button>
 </div>
 </div>
 )}
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {chantiersPaginated.map((chantier) => (
 <div
 key={chantier.id}
 onClick={() => navigate(`/chantiers/${chantier.id}`)}
 className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
 >
 <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
 <h3 className="text-lg font-bold mb-1">{chantier.nom}</h3>
 <p className="text-blue-100 text-sm">{chantier.client}</p>
 </div>
 <div className="p-4 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Phase:</span>
 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
 {chantier.phase}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Score santé:</span>
 <div className="flex items-center gap-2">
 <div className="w-20 bg-gray-200 rounded-full h-2">
 <div
 className={`h-2 rounded-full ${
 chantier.health_score >= 80
 ? 'bg-green-500'
 : chantier.health_score >= 50
 ? 'bg-orange-500'
 : 'bg-red-500'
 }`}
 style={{ width: `${chantier.health_score}%` }}
 ></div>
 </div>
 <span className={`text-sm font-semibold ${getScoreColor(chantier.health_score)}`}>
 {chantier.health_score}
 </span>
 </div>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Avancement:</span>
 <div className="flex items-center gap-2">
 <div className="w-20 bg-gray-200 rounded-full h-2">
 <div
 className="bg-blue-600 h-2 rounded-full"
 style={{ width: `${chantier.avancement_physique}%` }}
 ></div>
 </div>
 <span className="text-sm font-medium text-gray-700">{chantier.avancement_physique}%</span>
 </div>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">CA:</span>
 <span className="text-sm font-medium text-gray-900">
 {chantier.charge_affaires_prenom} {chantier.charge_affaires_nom}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Statut:</span>
 <span
 className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatutBadge(
 chantier.statut
 )}`}
 >
 {chantier.statut}
 </span>
 </div>
 <div className="flex items-center justify-between border-t pt-3 mt-3">
 <span className="text-sm text-gray-600">Date fin prévue:</span>
 <span className="text-sm font-medium text-gray-900">
 {chantier.date_fin_prevue
 ? new Date(chantier.date_fin_prevue).toLocaleDateString('fr-FR')
 : 'N/A'}
 </span>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Modal Nouveau Chantier */}
 {showNewChantierForm && (
 <NewChantierForm
 onClose={() => {
 setShowNewChantierForm(false);
 refetch();
 }}
 />
 )}
 </div>
 );
};

export default ChantiersListPage;