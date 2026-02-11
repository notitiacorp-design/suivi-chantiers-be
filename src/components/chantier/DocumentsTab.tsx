import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Download, Upload, Search, X, Eye, Trash2, FileText, Image as ImageIcon, File } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type DocumentCategory = 'plans' | 'pv_reunion' | 'doe' | 'dgd' | 'fiches_techniques' | 'photos' | 'autres';

interface Document {
 id: string;
 chantier_id: string;
 nom: string;
 categorie: DocumentCategory;
 type_fichier: string;
 url: string;
 taille: number;
 version: string;
 uploade_par: string;
 created_at: string;
 updated_at: string;
}

interface DocumentsTabProps {
 chantierId: string;
}

const CATEGORIES = [
 { value: 'plans', label: 'Plans', icon: FileText },
 { value: 'pv_reunion', label: 'PV Réunion', icon: FileText },
 { value: 'doe', label: 'DOE', icon: FileText },
 { value: 'dgd', label: 'DGD', icon: FileText },
 { value: 'fiches_techniques', label: 'Fiches Techniques', icon: FileText },
 { value: 'photos', label: 'Photos', icon: ImageIcon },
 { value: 'autres', label: 'Autres', icon: File },
] as const;

export default function DocumentsTab({ chantierId }: DocumentsTabProps) {
 const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
 const [searchTerm, setSearchTerm] = useState('');
 const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
 const queryClient = useQueryClient();

 const { data: documents = [], isLoading } = useQuery({
 queryKey: ['documents', chantierId, selectedCategory],
 queryFn: async () => {
 let query = supabase
 .from('documents')
 .select('*')
 .eq('chantier_id', chantierId)
 .order('created_at', { ascending: false });

 if (selectedCategory !== 'all') {
 query = query.eq('categorie', selectedCategory);
 }

 const { data, error } = await query;
 if (error) throw error;
 return data as Document[];
 },
 });

 const uploadMutation = useMutation({
 mutationFn: async ({ file, category, version }: { file: File; category: DocumentCategory; version: string }) => {
 const fileExt = file.name.split('.').pop();
 const fileName = `${chantierId}/${category}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

 const { error: uploadError } = await supabase.storage
 .from('documents')
 .upload(fileName, file);

 if (uploadError) throw uploadError;

 const { data: { publicUrl } } = supabase.storage
 .from('documents')
 .getPublicUrl(fileName);

 const { data: userData } = await supabase.auth.getUser();

 const { data, error } = await supabase
 .from('documents')
 .insert({
 chantier_id: chantierId,
 nom: file.name,
 categorie: category,
 type_fichier: file.type,
 url: publicUrl,
 taille: file.size,
 version: version,
 uploade_par: userData.user?.email || 'Inconnu',
 })
 .select()
 .single();

 if (error) throw error;
 return data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['documents', chantierId] });
 },
 });

 const deleteMutation = useMutation({
 mutationFn: async (documentId: string) => {
 const document = documents.find(d => d.id === documentId);
 if (!document) throw new Error('Document non trouvé');

 const filePath = document.url.split('/documents/')[1];
 await supabase.storage.from('documents').remove([filePath]);

 const { error } = await supabase
 .from('documents')
 .delete()
 .eq('id', documentId);

 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['documents', chantierId] });
 },
 });

 const onDrop = useCallback((acceptedFiles: File[], category: DocumentCategory) => {
 acceptedFiles.forEach(file => {
 const version = prompt('Version du document (ex: V1, V2):', 'V1');
 if (version) {
 uploadMutation.mutate({ file, category, version });
 }
 });
 }, [uploadMutation]);

 const filteredDocuments = documents.filter(doc =>
 doc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
 doc.version.toLowerCase().includes(searchTerm.toLowerCase())
 );

 const documentsByCategory = CATEGORIES.reduce((acc, cat) => {
 acc[cat.value] = filteredDocuments.filter(d => d.categorie === cat.value);
 return acc;
 }, {} as Record<DocumentCategory, Document[]>);

 const downloadDocument = async (doc: Document) => {
 const link = document.createElement('a');
 link.href = doc.url;
 link.download = doc.nom;
 link.click();
 };

 const formatFileSize = (bytes: number) => {
 if (bytes < 1024) return bytes + ' B';
 if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
 return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
 };

 const isImage = (type: string) => type.startsWith('image/');
 const isPDF = (type: string) => type === 'application/pdf';

 return (
 <div className="space-y-6">
 {/* Header avec recherche */}
 <div className="flex justify-between items-center">
 <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
 <div className="relative w-96">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
 <input
 type="text"
 placeholder="Rechercher un document..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 </div>

 {/* Filtres par catégorie */}
 <div className="flex gap-2 overflow-x-auto pb-2">
 <button
 onClick={() => setSelectedCategory('all')}
 className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
 selectedCategory === 'all'
 ? 'bg-blue-600 text-white'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 Tous ({documents.length})
 </button>
 {CATEGORIES.map(cat => (
 <button
 key={cat.value}
 onClick={() => setSelectedCategory(cat.value)}
 className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
 selectedCategory === cat.value
 ? 'bg-blue-600 text-white'
 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 <cat.icon className="h-4 w-4" />
 {cat.label} ({documentsByCategory[cat.value]?.length || 0})
 </button>
 ))}
 </div>

 {/* Grille de documents par catégorie */}
 {isLoading ? (
 <div className="flex justify-center items-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 ) : (
 <div className="space-y-8">
 {CATEGORIES.map(category => {
 const categoryDocs = selectedCategory === 'all' 
 ? documentsByCategory[category.value]
 : selectedCategory === category.value
 ? filteredDocuments
 : [];

 if (selectedCategory !== 'all' && selectedCategory !== category.value) return null;
 if (categoryDocs.length === 0 && selectedCategory === 'all') return null;

 return (
 <CategorySection
 key={category.value}
 category={category}
 documents={categoryDocs}
 onDrop={(files) => onDrop(files, category.value)}
 onPreview={setPreviewDocument}
 onDownload={downloadDocument}
 onDelete={(id) => deleteMutation.mutate(id)}
 isUploading={uploadMutation.isPending}
 />
 );
 })}
 </div>
 )}

 {/* Modal de prévisualisation */}
 {previewDocument && (
 <PreviewModal
 document={previewDocument}
 onClose={() => setPreviewDocument(null)}
 onDownload={() => downloadDocument(previewDocument)}
 />
 )}
 </div>
 );
}

interface CategorySectionProps {
 category: typeof CATEGORIES[number];
 documents: Document[];
 onDrop: (files: File[]) => void;
 onPreview: (doc: Document) => void;
 onDownload: (doc: Document) => void;
 onDelete: (id: string) => void;
 isUploading: boolean;
}

function CategorySection({
 category,
 documents,
 onDrop,
 onPreview,
 onDownload,
 onDelete,
 isUploading
}: CategorySectionProps) {
 const { getRootProps, getInputProps, isDragActive } = useDropzone({
 onDrop,
 accept: category.value === 'photos'
 ? { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }
 : {
 'application/pdf': ['.pdf'],
 'application/msword': ['.doc'],
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
 'application/vnd.ms-excel': ['.xls'],
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
 'image/*': ['.png', '.jpg', '.jpeg'],
 },
 });

 const formatFileSize = (bytes: number) => {
 if (bytes < 1024) return bytes + ' B';
 if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
 return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
 };

 const isImage = (type: string) => type.startsWith('image/');
 const isPDF = (type: string) => type === 'application/pdf';

 return (
 <div className="bg-white rounded-lg shadow-md p-6">
 <div className="flex items-center gap-3 mb-4">
 <category.icon className="h-6 w-6 text-blue-600" />
 <h3 className="text-lg font-semibold text-gray-900">{category.label}</h3>
 <span className="text-sm text-gray-500">({documents.length})</span>
 </div>

 {/* Zone de drop */}
 <div
 {...getRootProps()}
 className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer mb-6 ${
 isDragActive
 ? 'border-blue-500 bg-blue-50'
 : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
 }`}
 >
 <input {...getInputProps()} />
 <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600 mb-1">
 {isDragActive
 ? 'Déposez les fichiers ici...'
 : 'Glissez-déposez des fichiers ici ou cliquez pour sélectionner'}
 </p>
 <p className="text-sm text-gray-500">
 {category.value === 'photos' ? 'Images uniquement' : 'PDF, Word, Excel, Images'}
 </p>
 {isUploading && (
 <div className="mt-4">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
 <p className="text-sm text-gray-600 mt-2">Upload en cours...</p>
 </div>
 )}
 </div>

 {/* Grille de documents */}
 {documents.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {documents.map(doc => (
 <div
 key={doc.id}
 className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
 >
 {/* Miniature */}
 <div className="h-48 bg-gray-100 flex items-center justify-center relative group">
 {isImage(doc.type_fichier) ? (
 <img
 src={doc.url}
 alt={doc.nom}
 className="w-full h-full object-cover"
 />
 ) : isPDF(doc.type_fichier) ? (
 <FileText className="h-20 w-20 text-red-500" />
 ) : (
 <File className="h-20 w-20 text-gray-400" />
 )}
 <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
 <button
 onClick={() => onPreview(doc)}
 className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100"
 title="Prévisualiser"
 >
 <Eye className="h-5 w-5" />
 </button>
 <button
 onClick={() => onDownload(doc)}
 className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100"
 title="Télécharger"
 >
 <Download className="h-5 w-5" />
 </button>
 <button
 onClick={() => {
 if (confirm('Supprimer ce document ?')) {
 onDelete(doc.id);
 }
 }}
 className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
 title="Supprimer"
 >
 <Trash2 className="h-5 w-5" />
 </button>
 </div>
 </div>

 {/* Infos */}
 <div className="p-3">
 <h4 className="font-medium text-gray-900 truncate mb-1" title={doc.nom}>
 {doc.nom}
 </h4>
 <div className="space-y-1 text-xs text-gray-500">
 <div className="flex justify-between">
 <span>Version:</span>
 <span className="font-medium text-blue-600">{doc.version}</span>
 </div>
 <div className="flex justify-between">
 <span>Taille:</span>
 <span>{formatFileSize(doc.taille)}</span>
 </div>
 <div className="flex justify-between">
 <span>Uploadé par:</span>
 <span className="truncate max-w-[120px]" title={doc.uploade_par}>
 {doc.uploade_par}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Date:</span>
 <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8 text-gray-500">
 Aucun document dans cette catégorie
 </div>
 )}
 </div>
 );
}

interface PreviewModalProps {
 document: Document;
 onClose: () => void;
 onDownload: () => void;
}

function PreviewModal({ document: doc, onClose, onDownload }: PreviewModalProps) {
 const isImage = doc.type_fichier.startsWith('image/');
 const isPDF = doc.type_fichier === 'application/pdf';

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
 <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
 {/* Header */}
 <div className="flex justify-between items-center p-4 border-b">
 <div>
 <h3 className="font-semibold text-lg text-gray-900">{doc.nom}</h3>
 <p className="text-sm text-gray-500">Version {doc.version}</p>
 </div>
 <div className="flex gap-2">
 <button
 onClick={onDownload}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
 >
 <Download className="h-4 w-4" />
 Télécharger
 </button>
 <button
 onClick={onClose}
 className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
 >
 <X className="h-6 w-6" />
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-auto p-4">
 {isImage ? (
 <img src={doc.url} alt={doc.nom} className="max-w-full h-auto mx-auto" />
 ) : isPDF ? (
 <iframe src={doc.url} className="w-full h-[70vh] border-0" />
 ) : (
 <div className="flex flex-col items-center justify-center h-64">
 <File className="h-24 w-24 text-gray-400 mb-4" />
 <p className="text-gray-600">Aperçu non disponible pour ce type de fichier</p>
 <button
 onClick={onDownload}
 className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 Télécharger le fichier
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

// ============================================
// FICHIER 2: src/components/chantier/AvenantsTable.tsx
// ============================================