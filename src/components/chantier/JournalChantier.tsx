import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Filter, Upload, X, MessageSquare, AlertTriangle, Edit, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface JournalEntry {
 id: string;
 chantier_id: string;
 type: string;
 contenu: string;
 auteur: string;
 piece_jointe_url: string | null;
 piece_jointe_nom: string | null;
 created_at: string;
}

interface JournalChantierProps {
 chantierId: string;
}

const JournalChantier: React.FC<JournalChantierProps> = ({ chantierId }) => {
 const [entries, setEntries] = useState<JournalEntry[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [filterType, setFilterType] = useState<string>('all');
 const [page, setPage] = useState(1);
 const [hasMore, setHasMore] = useState(true);
 const observerTarget = useRef<HTMLDivElement>(null);

 // Form state
 const [newEntry, setNewEntry] = useState({
 type: 'Note',
 contenu: '',
 });
 const [uploadedFile, setUploadedFile] = useState<File | null>(null);

 useEffect(() => {
 loadEntries();

 // Supabase realtime
 const channel = supabase
 .channel(`journal-${chantierId}`)
 .on(
 'postgres_changes',
 {
 event: '*',
 schema: 'public',
 table: 'journal_chantier',
 filter: `chantier_id=eq.${chantierId}`,
 },
 () => {
 loadEntries(true);
 }
 )
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 }, [chantierId, filterType]);

 // Infinite scroll
 useEffect(() => {
 const observer = new IntersectionObserver(
 (entries) => {
 if (entries[0].isIntersecting && hasMore && !loading) {
 setPage((prev) => prev + 1);
 }
 },
 { threshold: 1.0 }
 );

 if (observerTarget.current) {
 observer.observe(observerTarget.current);
 }

 return () => observer.disconnect();
 }, [hasMore, loading]);

 useEffect(() => {
 if (page > 1) {
 loadMoreEntries();
 }
 }, [page]);

 const loadEntries = async (refresh = false) => {
 try {
 setLoading(true);
 let query = supabase
 .from('journal_chantier')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('created_at', { ascending: false })
 .range(0, 9);

 if (filterType !== 'all') {
 query = query.eq('type', filterType);
 }

 const { data, error } = await query;

 if (error) throw error;
 setEntries(data || []);
 setHasMore((data || []).length === 10);
 setPage(1);
 } catch (error: any) {
 console.error('Erreur chargement journal:', error);
 toast.error('Erreur lors du chargement du journal');
 } finally {
 setLoading(false);
 }
 };

 const loadMoreEntries = async () => {
 try {
 let query = supabase
 .from('journal_chantier')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('created_at', { ascending: false })
 .range(page * 10, (page + 1) * 10 - 1);

 if (filterType !== 'all') {
 query = query.eq('type', filterType);
 }

 const { data, error } = await query;

 if (error) throw error;

 if (data && data.length > 0) {
 setEntries((prev) => [...prev, ...data]);
 setHasMore(data.length === 10);
 } else {
 setHasMore(false);
 }
 } catch (error: any) {
 console.error('Erreur chargement plus d\'entrées:', error);
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 if (!newEntry.contenu.trim()) {
 toast.error('Le contenu est requis');
 return;
 }

 try {
 let pieceJointeUrl = null;
 let pieceJointeNom = null;

 // Upload file if present
 if (uploadedFile) {
 const fileExt = uploadedFile.name.split('.').pop();
 const fileName = `${chantierId}/${Date.now()}.${fileExt}`;

 const { data: uploadData, error: uploadError } = await supabase.storage
 .from('journal-attachments')
 .upload(fileName, uploadedFile);

 if (uploadError) throw uploadError;

 const { data: urlData } = supabase.storage
 .from('journal-attachments')
 .getPublicUrl(fileName);

 pieceJointeUrl = urlData.publicUrl;
 pieceJointeNom = uploadedFile.name;
 }

 const { error } = await supabase.from('journal_chantier').insert({
 chantier_id: chantierId,
 type: newEntry.type,
 contenu: newEntry.contenu,
 auteur: 'Utilisateur actuel', // TODO: Get from auth context
 piece_jointe_url: pieceJointeUrl,
 piece_jointe_nom: pieceJointeNom,
 });

 if (error) throw error;

 toast.success('Entrée ajoutée au journal');
 setNewEntry({ type: 'Note', contenu: '' });
 setUploadedFile(null);
 setShowForm(false);
 } catch (error: any) {
 console.error('Erreur ajout entrée:', error);
 toast.error('Erreur lors de l\'ajout de l\'entrée');
 }
 };

 const getTypeIcon = (type: string) => {
 switch (type) {
 case 'Note':
 return <MessageSquare className="w-5 h-5 text-blue-600" />;
 case 'Alerte':
 return <AlertTriangle className="w-5 h-5 text-red-600" />;
 case 'Modification':
 return <Edit className="w-5 h-5 text-orange-600" />;
 case 'Photo':
 return <Camera className="w-5 h-5 text-green-600" />;
 default:
 return <MessageSquare className="w-5 h-5 text-gray-600" />;
 }
 };

 const getTypeBgColor = (type: string) => {
 switch (type) {
 case 'Note':
 return 'bg-blue-100';
 case 'Alerte':
 return 'bg-red-100';
 case 'Modification':
 return 'bg-orange-100';
 case 'Photo':
 return 'bg-green-100';
 default:
 return 'bg-gray-100';
 }
 };

 const formatDate = (date: string) => {
 const d = new Date(date);
 const now = new Date();
 const diffMs = now.getTime() - d.getTime();
 const diffMins = Math.floor(diffMs / 60000);
 const diffHours = Math.floor(diffMs / 3600000);
 const diffDays = Math.floor(diffMs / 86400000);

 if (diffMins < 1) return 'À l\'instant';
 if (diffMins < 60) return `Il y a ${diffMins} min`;
 if (diffHours < 24) return `Il y a ${diffHours}h`;
 if (diffDays < 7) return `Il y a ${diffDays}j`;

 return d.toLocaleDateString('fr-FR', {
 day: 'numeric',
 month: 'short',
 year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
 });
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-gray-900">Journal de chantier</h2>
 <button
 onClick={() => setShowForm(!showForm)}
 className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
 >
 <Plus className="w-4 h-4" />
 <span>Nouvelle entrée</span>
 </button>
 </div>

 {/* Filtres */}
 <div className="flex items-center space-x-2">
 <Filter className="w-4 h-4 text-gray-400" />
 {['all', 'Note', 'Alerte', 'Modification', 'Photo'].map((type) => (
 <button
 key={type}
 onClick={() => setFilterType(type)}
 className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
 filterType === type
 ? 'bg-blue-100 text-blue-800'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 {type === 'all' ? 'Tous' : type}
 </button>
 ))}
 </div>
 </div>

 {/* Formulaire nouvelle entrée */}
 {showForm && (
 <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Type d'entrée
 </label>
 <div className="grid grid-cols-4 gap-2">
 {['Note', 'Alerte', 'Modification', 'Photo'].map((type) => (
 <button
 key={type}
 type="button"
 onClick={() => setNewEntry({ ...newEntry, type })}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
 newEntry.type === type
 ? 'bg-blue-600 text-white'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 {type}
 </button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Contenu
 </label>
 <textarea
 value={newEntry.contenu}
 onChange={(e) => setNewEntry({ ...newEntry, contenu: e.target.value })}
 placeholder="Décrivez l'événement, la note, ou l'alerte..."
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 rows={4}
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Pièce jointe (optionnel)
 </label>
 <div className="flex items-center space-x-2">
 <label className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
 <Upload className="w-4 h-4" />
 <span>Choisir un fichier</span>
 <input
 type="file"
 onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
 className="hidden"
 accept="image/*,.pdf,.doc,.docx"
 />
 </label>
 {uploadedFile && (
 <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg">
 <span className="text-sm">{uploadedFile.name}</span>
 <button
 type="button"
 onClick={() => setUploadedFile(null)}
 className="hover:bg-blue-100 rounded p-1"
 >
 <X className="w-3 h-3" />
 </button>
 </div>
 )}
 </div>
 </div>

 <div className="flex items-center space-x-3">
 <button
 type="submit"
 className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
 >
 Ajouter l'entrée
 </button>
 <button
 type="button"
 onClick={() => {
 setShowForm(false);
 setNewEntry({ type: 'Note', contenu: '' });
 setUploadedFile(null);
 }}
 className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
 >
 Annuler
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Timeline */}
 <div className="bg-white rounded-lg shadow border border-gray-200">
 {loading && entries.length === 0 ? (
 <div className="flex justify-center items-center py-12">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
 </div>
 ) : entries.length > 0 ? (
 <div className="relative">
 {/* Timeline line */}
 <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-gray-200" />

 <div className="divide-y divide-gray-200">
 {entries.map((entry, index) => (
 <div key={entry.id} className="relative px-6 py-4 hover:bg-gray-50">
 {/* Timeline dot */}
 <div
 className={`absolute left-10 w-5 h-5 rounded-full border-4 border-white ${
 getTypeBgColor(entry.type)
 }`}
 />

 <div className="pl-10">
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center space-x-3">
 <div className={`p-2 rounded-lg ${getTypeBgColor(entry.type)}`}>
 {getTypeIcon(entry.type)}
 </div>
 <div>
 <p className="text-sm font-medium text-gray-900">{entry.type}</p>
 <p className="text-xs text-gray-500">
 {entry.auteur} • {formatDate(entry.created_at)}
 </p>
 </div>
 </div>
 </div>

 <p className="text-sm text-gray-700 whitespace-pre-wrap">
 {entry.contenu}
 </p>

 {entry.piece_jointe_url && (
 <a
 href={entry.piece_jointe_url}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center space-x-2 mt-3 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
 >
 <Upload className="w-4 h-4" />
 <span>{entry.piece_jointe_nom || 'Pièce jointe'}</span>
 </a>
 )}
 </div>
 </div>
 ))}
 </div>

 {/* Infinite scroll trigger */}
 {hasMore && (
 <div ref={observerTarget} className="flex justify-center py-4">
 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
 </div>
 )}
 </div>
 ) : (
 <div className="text-center py-12">
 <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
 <p className="text-gray-500">Aucune entrée dans le journal</p>
 <p className="text-sm text-gray-400 mt-1">
 Commencez par ajouter une note ou une alerte
 </p>
 </div>
 )}
 </div>
 </div>
 );
};

export default JournalChantier;