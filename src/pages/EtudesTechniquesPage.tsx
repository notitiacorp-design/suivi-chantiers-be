import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Edit2, Trash2, X, FileText, AlertCircle, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

type TypeEtude = 'bilan_puissances' | 'plan_implantation' | 'plan_reservations' | 'dessin_bim' | 'fiche_technique' | 'devis_x';
type Statut = 'a_produire' | 'en_cours' | 'transmis' | 'valide' | 'refuse';
type Priorite = 'basse' | 'moyenne' | 'haute' | 'critique';

interface EtudeTechnique {
  id: string;
  chantier_id: string;
  type_etude: TypeEtude;
  titre: string;
  description: string | null;
  statut: Statut;
  date_remise: string | null;
  date_validation: string | null;
  responsable_id: string | null;
  priorite: Priorite;
  commentaire: string | null;
  fichier_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Chantier {
  id: string;
  nom: string;
}

interface Profile {
  id: string;
  nom_complet: string;
}

const TYPE_ETUDE_LABELS: Record<TypeEtude, string> = {
  bilan_puissances: 'Bilan de puissances',
  plan_implantation: "Plan d'implantation",
  plan_reservations: 'Plan de r\u00e9servations',
  dessin_bim: 'Dessin BIM',
  fiche_technique: 'Fiche technique',
  devis_x: 'Devis X'
};

const STATUT_LABELS: Record<Statut, string> = {
  a_produire: '\u00c0 produire',
  en_cours: 'En cours',
  transmis: 'Transmis',
  valide: 'Valid\u00e9',
  refuse: 'Refus\u00e9'
};

const PRIORITE_LABELS: Record<Priorite, string> = {
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  critique: 'Critique'
};

const STATUT_COLORS: Record<Statut, string> = {
  a_produire: 'bg-gray-100 text-gray-800 border-gray-300',
  en_cours: 'bg-blue-100 text-blue-800 border-blue-300',
  transmis: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  valide: 'bg-green-100 text-green-800 border-green-300',
  refuse: 'bg-red-100 text-red-800 border-red-300'
};

const PRIORITE_COLORS: Record<Priorite, string> = {
  basse: 'bg-gray-100 text-gray-600 border-gray-300',
  moyenne: 'bg-blue-100 text-blue-600 border-blue-300',
  haute: 'bg-orange-100 text-orange-600 border-orange-300',
  critique: 'bg-red-100 text-red-600 border-red-300'
};

const STATUT_ICONS: Record<Statut, React.ReactNode> = {
  a_produire: <AlertCircle className="w-4 h-4" />,
  en_cours: <Clock className="w-4 h-4" />,
  transmis: <FileText className="w-4 h-4" />,
  valide: <CheckCircle className="w-4 h-4" />,
  refuse: <XCircle className="w-4 h-4" />
};

export default function EtudesTechniquesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEtude, setEditingEtude] = useState<EtudeTechnique | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterChantier, setFilterChantier] = useState<string>('all');

  const [formData, setFormData] = useState<Partial<EtudeTechnique>>({
    chantier_id: '',
    type_etude: 'bilan_puissances',
    titre: '',
    description: '',
    statut: 'a_produire',
    date_remise: '',
    date_validation: '',
    responsable_id: '',
    priorite: 'moyenne',
    commentaire: '',
    fichier_url: ''
  });

  const { data: etudes = [], isLoading } = useQuery({
    queryKey: ['etudes_techniques'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('etudes_techniques')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EtudeTechnique[];
    }
  });

  const { data: chantiers = [] } = useQuery({
    queryKey: ['chantiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chantiers')
        .select('id, nom')
        .order('nom');
      if (error) throw error;
      return data as Chantier[];
    }
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nom_complet')
        .order('nom_complet');
      if (error) throw error;
      return data as Profile[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newEtude: Partial<EtudeTechnique>) => {
      const { data, error } = await supabase
        .from('etudes_techniques')
        .insert([{ ...newEtude, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etudes_techniques'] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EtudeTechnique> & { id: string }) => {
      const { data, error } = await supabase
        .from('etudes_techniques')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etudes_techniques'] });
      setIsModalOpen(false);
      setEditingEtude(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('etudes_techniques')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etudes_techniques'] });
    }
  });

  const filteredEtudes = useMemo(() => {
    return etudes.filter(etude => {
      const matchesSearch = searchTerm === '' || 
        etude.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (etude.description && etude.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || etude.type_etude === filterType;
      const matchesStatut = filterStatut === 'all' || etude.statut === filterStatut;
      const matchesChantier = filterChantier === 'all' || etude.chantier_id === filterChantier;
      return matchesSearch && matchesType && matchesStatut && matchesChantier;
    });
  }, [etudes, searchTerm, filterType, filterStatut, filterChantier]);

  const stats = useMemo(() => {
    return {
      a_produire: etudes.filter(e => e.statut === 'a_produire').length,
      en_cours: etudes.filter(e => e.statut === 'en_cours').length,
      transmis: etudes.filter(e => e.statut === 'transmis').length,
      valide: etudes.filter(e => e.statut === 'valide').length
    };
  }, [etudes]);

  const resetForm = () => {
    setFormData({
      chantier_id: '',
      type_etude: 'bilan_puissances',
      titre: '',
      description: '',
      statut: 'a_produire',
      date_remise: '',
      date_validation: '',
      responsable_id: '',
      priorite: 'moyenne',
      commentaire: '',
      fichier_url: ''
    });
  };

  const handleOpenModal = (etude?: EtudeTechnique) => {
    if (etude) {
      setEditingEtude(etude);
      setFormData({
        chantier_id: etude.chantier_id,
        type_etude: etude.type_etude,
        titre: etude.titre,
        description: etude.description || '',
        statut: etude.statut,
        date_remise: etude.date_remise || '',
        date_validation: etude.date_validation || '',
        responsable_id: etude.responsable_id || '',
        priorite: etude.priorite,
        commentaire: etude.commentaire || '',
        fichier_url: etude.fichier_url || ''
      });
    } else {
      setEditingEtude(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEtude) {
      updateMutation.mutate({ id: editingEtude.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('\u00cates-vous s\u00fbr de vouloir supprimer cette \u00e9tude technique ?')) {
      deleteMutation.mutate(id);
    }
  };

  const getChantierNom = (chantierId: string) => {
    const chantier = chantiers.find(c => c.id === chantierId);
    return chantier ? chantier.nom : 'N/A';
  };

  const getResponsableNom = (responsableId: string | null) => {
    if (!responsableId) return 'Non assign\u00e9';
    const profile = profiles.find(p => p.id === responsableId);
    return profile ? profile.nom_complet : 'N/A';
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">\u00c9tudes Techniques</h1>
          <p className="text-gray-600">Gestion des \u00e9tudes techniques pour vos chantiers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">\u00c0 produire</p>
                <p className="text-2xl font-bold text-[#1e3a5f]">{stats.a_produire}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">En cours</p>
                <p className="text-2xl font-bold text-[#1e3a5f]">{stats.en_cours}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Transmis</p>
                <p className="text-2xl font-bold text-[#1e3a5f]">{stats.transmis}</p>
              </div>
              <FileText className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Valid\u00e9</p>
                <p className="text-2xl font-bold text-[#1e3a5f]">{stats.valide}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par titre ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
            >
              <option value="all">Tous les types</option>
              {Object.entries(TYPE_ETUDE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(STATUT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={filterChantier}
              onChange={(e) => setFilterChantier(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
            >
              <option value="all">Tous les chantiers</option>
              {chantiers.map((chantier) => (
                <option key={chantier.id} value={chantier.id}>{chantier.nom}</option>
              ))}
            </select>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-6 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Nouvelle \u00e9tude
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Chargement...</div>
          ) : filteredEtudes.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Aucune \u00e9tude technique trouv\u00e9e</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1e3a5f] text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Titre</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Chantier</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Priorit\u00e9</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Responsable</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Date de remise</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEtudes.map((etude) => (
                    <tr key={etude.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-[#1e3a5f]">{etude.titre}</div>
                          {etude.description && (
                            <div className="text-sm text-gray-500 mt-1">{etude.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{TYPE_ETUDE_LABELS[etude.type_etude]}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{getChantierNom(etude.chantier_id)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${STATUT_COLORS[etude.statut]}`}>
                          {STATUT_ICONS[etude.statut]}
                          {STATUT_LABELS[etude.statut]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${PRIORITE_COLORS[etude.priorite]}`}>
                          {etude.priorite === 'critique' && <AlertTriangle className="w-3 h-3" />}
                          {PRIORITE_LABELS[etude.priorite]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{getResponsableNom(etude.responsable_id)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {etude.date_remise ? new Date(etude.date_remise).toLocaleDateString('fr-FR') : 'Non d\u00e9finie'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(etude)}
                            className="p-2 text-[#3b82f6] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(etude.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1e3a5f]">
                {editingEtude ? 'Modifier l\'\u00e9tude technique' : 'Nouvelle \u00e9tude technique'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEtude(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d'\u00e9tude <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type_etude}
                    onChange={(e) => setFormData({ ...formData, type_etude: e.target.value as TypeEtude })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    required
                  >
                    {Object.entries(TYPE_ETUDE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chantier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.chantier_id}
                    onChange={(e) => setFormData({ ...formData, chantier_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    required
                  >
                    <option value="">S\u00e9lectionner un chantier</option>
                    {chantiers.map((chantier) => (
                      <option key={chantier.id} value={chantier.id}>{chantier.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as Statut })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    required
                  >
                    {Object.entries(STATUT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priorit\u00e9 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.priorite}
                    onChange={(e) => setFormData({ ...formData, priorite: e.target.value as Priorite })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    required
                  >
                    {Object.entries(PRIORITE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable
                  </label>
                  <select
                    value={formData.responsable_id || ''}
                    onChange={(e) => setFormData({ ...formData, responsable_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  >
                    <option value="">Non assign\u00e9</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>{profile.nom_complet}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de remise
                  </label>
                  <input
                    type="date"
                    value={formData.date_remise || ''}
                    onChange={(e) => setFormData({ ...formData, date_remise: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de validation
                  </label>
                  <input
                    type="date"
                    value={formData.date_validation || ''}
                    onChange={(e) => setFormData({ ...formData, date_validation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaire
                  </label>
                  <textarea
                    value={formData.commentaire || ''}
                    onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL du fichier
                  </label>
                  <input
                    type="text"
                    value={formData.fichier_url || ''}
                    onChange={(e) => setFormData({ ...formData, fichier_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEtude(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Enregistrement...'
                    : editingEtude
                    ? 'Mettre \u00e0 jour'
                    : 'Cr\u00e9er'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}