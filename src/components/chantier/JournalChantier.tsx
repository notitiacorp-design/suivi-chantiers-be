import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Filter, Upload, X, MessageSquare, AlertTriangle, Edit, Camera, WifiOff } from 'lucide-react';
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
  const [tableExists, setTableExists] = useState<boolean>(true);
  const [localEntries, setLocalEntries] = useState<JournalEntry[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Form state
  const [newEntry, setNewEntry] = useState({
    type: 'Note',
    contenu: '',
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const isTableMissingError = (error: any): boolean => {
    if (!error) return false;
    const message = (error.message || '').toLowerCase();
    const code = error.code || '';
    return (
      code === '42P01' ||
      message.includes('does not exist') ||
      message.includes('relation') ||
      message.includes('undefined table') ||
      message.includes('journal_chantier')
    );
  };

  useEffect(() => {
    loadEntries();

    if (!tableExists) {
      return;
    }

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
  }, [chantierId, filterType, tableExists]);

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

      if (error) {
        if (isTableMissingError(error)) {
          console.warn('Table journal_chantier introuvable, basculement en mode local:', error);
          setTableExists(false);
          setEntries([]);
          setHasMore(false);
          return;
        }
        throw error;
      }

      setTableExists(true);
      setEntries(data || []);
      setHasMore((data || []).length === 10);
      setPage(1);
    } catch (error: any) {
      if (isTableMissingError(error)) {
        console.warn('Table journal_chantier introuvable, basculement en mode local:', error);
        setTableExists(false);
        setEntries([]);
        setHasMore(false);
      } else {
        console.error('Erreur chargement journal:', error);
        toast.error('Erreur lors du chargement du journal');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMoreEntries = async () => {
    if (!tableExists) return;

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

      if (error) {
        if (isTableMissingError(error)) {
          setTableExists(false);
          return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        setEntries((prev) => [...prev, ...data]);
        setHasMore(data.length === 10);
      } else {
        setHasMore(false);
      }
    } catch (error: any) {
      console.error("Erreur chargement plus d'entrées:", error);
    }
  };

  const getFilteredLocalEntries = (): JournalEntry[] => {
    if (filterType === 'all') {
      return localEntries.filter((e) => e.chantier_id === chantierId);
    }
    return localEntries.filter(
      (e) => e.chantier_id === chantierId && e.type === filterType
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEntry.contenu.trim()) {
      toast.error('Le contenu est requis');
      return;
    }

    if (!tableExists) {
      const localEntry: JournalEntry = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        chantier_id: chantierId,
        type: newEntry.type,
        contenu: newEntry.contenu,
        auteur: 'Utilisateur actuel',
        piece_jointe_url: uploadedFile ? URL.createObjectURL(uploadedFile) : null,
        piece_jointe_nom: uploadedFile ? uploadedFile.name : null,
        created_at: new Date().toISOString(),
      };

      setLocalEntries((prev) => [localEntry, ...prev]);
      toast.success('Entrée ajoutée localement (mode hors-ligne)');
      setNewEntry({ type: 'Note', contenu: '' });
      setUploadedFile(null);
      setShowForm(false);
      return;
    }

    try {
      let pieceJointeUrl = null;
      let pieceJointeNom = null;

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
        auteur: 'Utilisateur actuel',
        piece_jointe_url: pieceJointeUrl,
        piece_jointe_nom: pieceJointeNom,
      });

      if (error) {
        if (isTableMissingError(error)) {
          setTableExists(false);
          toast.error('Le journal est temporairement indisponible. Veuillez réessayer.');
          return;
        }
        throw error;
      }

      toast.success('Entrée ajoutée au journal');
      setNewEntry({ type: 'Note', contenu: '' });
      setUploadedFile(null);
      setShowForm(false);
    } catch (error: any) {
      console.error("Erreur lors de l'ajout d'entrée:", error);
      toast.error("Erreur lors de l'ajout de l'entrée");
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
        return <Camera className="w-5 h-5 text-purple-600" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Note':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Alerte':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'Modification':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Photo':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const displayedEntries = tableExists ? entries : getFilteredLocalEntries();

  return (
    <div className="space-y-6">
      {/* Warning Banner - shown when table does not exist */}
      {!tableExists && (
        <div className="flex items-start space-x-3 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <WifiOff className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              Table de base de données introuvable
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              La table <code className="font-mono bg-yellow-100 px-1 rounded">journal_chantier</code> n&apos;existe pas dans Supabase. Les entrées que vous ajoutez sont stockées <strong>uniquement en mémoire locale</strong> et seront perdues lors du rechargement de la page. Veuillez contacter votre administrateur pour créer la table.
            </p>
          </div>
        </div>
      )}

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
          {!tableExists && (
            <div className="flex items-center space-x-2 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <p className="text-xs text-yellow-700">
                Mode local actif — cette entrée ne sera pas sauvegardée dans la base de données.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d&apos;entrée
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
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Saisissez votre note, alerte ou commentaire..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pièce jointe (optionnel)
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {uploadedFile ? uploadedFile.name : 'Choisir un fichier'}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                </label>
                {uploadedFile && (
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {tableExists ? 'Ajouter' : 'Ajouter localement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des entrées */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : displayedEntries.length > 0 ? (
        <div className="space-y-4">
          {displayedEntries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white rounded-lg shadow p-6 border ${
                entry.id.startsWith('local-')
                  ? 'border-yellow-300'
                  : 'border-gray-200'
              }`}
            >
              {entry.id.startsWith('local-') && (
                <div className="flex items-center space-x-1 mb-3">
                  <WifiOff className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs text-yellow-600 font-medium">Stocké localement uniquement</span>
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(entry.type)}`}>
                    {getTypeIcon(entry.type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(entry.type)}`}
                      >
                        {entry.type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{entry.contenu}</p>
                    {entry.piece_jointe_url && (
                      <a
                        href={entry.piece_jointe_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 mt-2 text-blue-600 hover:text-blue-800"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">
                          {entry.piece_jointe_nom || 'Voir la pièce jointe'}
                        </span>
                      </a>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500">{entry.auteur}</span>
              </div>
            </div>
          ))}

          {tableExists && hasMore && (
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
            {!tableExists
              ? 'La table est indisponible. Vous pouvez ajouter des entrées localement.'
              : 'Commencez par ajouter une note ou une alerte'}
          </p>
        </div>
      )}
    </div>
  );
};

export default JournalChantier;
