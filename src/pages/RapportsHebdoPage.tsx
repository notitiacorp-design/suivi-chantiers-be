import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Plus, Search, Filter, X, Edit2, Trash2, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface Chantier {
  id: string;
  nom: string;
}

interface RapportHebdo {
  id: string;
  chantier_id: string;
  semaine_du: string;
  auteur_id: string;
  avancement_global: number;
  travaux_realises: string | null;
  travaux_prevus: string | null;
  planning_respecte: boolean;
  cause_retard: string | null;
  impact_retard: 'aucun' | 'leger' | 'important' | null;
  action_engagee: string | null;
  commandes_passees: boolean;
  livraisons_recues: string | null;
  risque_livraison: boolean;
  risque_detail: string | null;
  contraintes_acces: string | null;
  observations: string | null;
  statut: 'brouillon' | 'soumis' | 'valide';
  created_at: string;
  updated_at: string;
  chantiers: Chantier;
}

interface FormData {
  chantier_id: string;
  semaine_du: string;
  avancement_global: number;
  travaux_realises: string;
  travaux_prevus: string;
  planning_respecte: boolean;
  cause_retard: string;
  impact_retard: 'aucun' | 'leger' | 'important' | '';
  action_engagee: string;
  commandes_passees: boolean;
  livraisons_recues: string;
  risque_livraison: boolean;
  risque_detail: string;
  contraintes_acces: string;
  observations: string;
  statut: 'brouillon' | 'soumis' | 'valide';
}

const RapportsHebdoPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('tous');
  const [chantierFilter, setChantierFilter] = useState<string>('tous');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRapport, setEditingRapport] = useState<RapportHebdo | null>(null);
  const [expandedChantiers, setExpandedChantiers] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<FormData>({
    chantier_id: '',
    semaine_du: '',
    avancement_global: 0,
    travaux_realises: '',
    travaux_prevus: '',
    planning_respecte: true,
    cause_retard: '',
    impact_retard: '',
    action_engagee: '',
    commandes_passees: false,
    livraisons_recues: '',
    risque_livraison: false,
    risque_detail: '',
    contraintes_acces: '',
    observations: '',
    statut: 'brouillon'
  });

  const { data: rapports = [], isLoading } = useQuery<RapportHebdo[]>({
    queryKey: ['rapports_hebdo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rapports_hebdo')
        .select(`
          *,
          chantiers(id, nom)
        `)
        .order('semaine_du', { ascending: false });
      if (error) throw error;
      return data as RapportHebdo[];
    }
  });

  const { data: chantiers = [] } = useQuery<Chantier[]>({
    queryKey: ['chantiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chantiers')
        .select('id, nom')
        .order('nom');
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<FormData>) => {
      const { error } = await supabase
        .from('rapports_hebdo')
        .insert({ ...data, auteur_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports_hebdo'] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
      const { error } = await supabase
        .from('rapports_hebdo')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports_hebdo'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rapports_hebdo')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports_hebdo'] });
    }
  });

  const filteredRapports = useMemo(() => {
    return rapports.filter(rapport => {
      const matchesSearch = rapport.chantiers.nom.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'tous' || rapport.statut === statusFilter;
      const matchesChantier = chantierFilter === 'tous' || rapport.chantier_id === chantierFilter;
      return matchesSearch && matchesStatus && matchesChantier;
    });
  }, [rapports, searchTerm, statusFilter, chantierFilter]);

  const groupedRapports = useMemo(() => {
    const grouped = new Map<string, RapportHebdo[]>();
    filteredRapports.forEach(rapport => {
      const chantierId = rapport.chantier_id;
      if (!grouped.has(chantierId)) {
        grouped.set(chantierId, []);
      }
      grouped.get(chantierId)!.push(rapport);
    });
    return grouped;
  }, [filteredRapports]);

  const stats = useMemo(() => {
    const brouillon = rapports.filter(r => r.statut === 'brouillon').length;
    const soumis = rapports.filter(r => r.statut === 'soumis').length;
    const valide = rapports.filter(r => r.statut === 'valide').length;
    const avgAvancement = rapports.length > 0
      ? rapports.reduce((sum, r) => sum + r.avancement_global, 0) / rapports.length
      : 0;
    return { brouillon, soumis, valide, avgAvancement };
  }, [rapports]);

  const openModal = (rapport?: RapportHebdo) => {
    if (rapport) {
      setEditingRapport(rapport);
      setFormData({
        chantier_id: rapport.chantier_id,
        semaine_du: rapport.semaine_du,
        avancement_global: rapport.avancement_global,
        travaux_realises: rapport.travaux_realises || '',
        travaux_prevus: rapport.travaux_prevus || '',
        planning_respecte: rapport.planning_respecte,
        cause_retard: rapport.cause_retard || '',
        impact_retard: rapport.impact_retard || '',
        action_engagee: rapport.action_engagee || '',
        commandes_passees: rapport.commandes_passees,
        livraisons_recues: rapport.livraisons_recues || '',
        risque_livraison: rapport.risque_livraison,
        risque_detail: rapport.risque_detail || '',
        contraintes_acces: rapport.contraintes_acces || '',
        observations: rapport.observations || '',
        statut: rapport.statut
      });
    } else {
      setEditingRapport(null);
      setFormData({
        chantier_id: '',
        semaine_du: '',
        avancement_global: 0,
        travaux_realises: '',
        travaux_prevus: '',
        planning_respecte: true,
        cause_retard: '',
        impact_retard: '',
        action_engagee: '',
        commandes_passees: false,
        livraisons_recues: '',
        risque_livraison: false,
        risque_detail: '',
        contraintes_acces: '',
        observations: '',
        statut: 'brouillon'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRapport(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      impact_retard: formData.impact_retard || null
    };
    if (editingRapport) {
      updateMutation.mutate({ id: editingRapport.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('\u00cates-vous s\u00fbr de vouloir supprimer ce rapport ?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleChantier = (chantierId: string) => {
    const newExpanded = new Set(expandedChantiers);
    if (newExpanded.has(chantierId)) {
      newExpanded.delete(chantierId);
    } else {
      newExpanded.add(chantierId);
    }
    setExpandedChantiers(newExpanded);
  };

  const getStatutBadge = (statut: string) => {
    const styles = {
      brouillon: 'bg-gray-100 text-gray-700',
      soumis: 'bg-blue-100 text-blue-700',
      valide: 'bg-green-100 text-green-700'
    };
    const icons = {
      brouillon: <Clock className="w-3 h-3" />,
      soumis: <AlertCircle className="w-3 h-3" />,
      valide: <CheckCircle className="w-3 h-3" />
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[statut as keyof typeof styles]}`}>
        {icons[statut as keyof typeof icons]}
        {statut.charAt(0).toUpperCase() + statut.slice(1)}
      </span>
    );
  };

  const getImpactBadge = (impact: string) => {
    const styles = {
      aucun: 'bg-green-100 text-green-700',
      leger: 'bg-yellow-100 text-yellow-700',
      important: 'bg-red-100 text-red-700'
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[impact as keyof typeof styles]}`}>
        {impact.charAt(0).toUpperCase() + impact.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f5f7fa]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#1e3a5f]" />
            <h1 className="text-3xl font-bold text-[#1e3a5f]">Rapports Hebdomadaires</h1>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-[#3b82f6] text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau rapport
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Brouillons</p>
                <p className="text-2xl font-bold text-gray-700">{stats.brouillon}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Soumis</p>
                <p className="text-2xl font-bold text-blue-600">{stats.soumis}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valid\u00e9s</p>
                <p className="text-2xl font-bold text-green-600">{stats.valide}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avancement moyen</p>
                <p className="text-2xl font-bold text-[#1e3a5f]">{stats.avgAvancement.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[#3b82f6]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par chantier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6] appearance-none bg-white"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="brouillon">Brouillon</option>
                  <option value="soumis">Soumis</option>
                  <option value="valide">Valid\u00e9</option>
                </select>
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={chantierFilter}
                  onChange={(e) => setChantierFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6] appearance-none bg-white"
                >
                  <option value="tous">Tous les chantiers</option>
                  {chantiers.map(chantier => (
                    <option key={chantier.id} value={chantier.id}>{chantier.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {Array.from(groupedRapports.entries()).map(([chantierId, chantierRapports]) => {
            const chantier = chantierRapports[0].chantiers;
            const isExpanded = expandedChantiers.has(chantierId);
            return (
              <div key={chantierId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleChantier(chantierId)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    <h3 className="text-lg font-semibold text-[#1e3a5f]">{chantier.nom}</h3>
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                      {chantierRapports.length} rapport{chantierRapports.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-4 bg-[#f5f7fa] space-y-3">
                    {chantierRapports.map(rapport => (
                      <div key={rapport.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="text-sm font-medium text-gray-600">
                                Semaine du {new Date(rapport.semaine_du).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </p>
                              {getStatutBadge(rapport.statut)}
                              {!rapport.planning_respecte && rapport.impact_retard && getImpactBadge(rapport.impact_retard)}
                            </div>
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-gray-600">Avancement global</span>
                                <span className="text-sm font-semibold text-[#1e3a5f]">{rapport.avancement_global}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-[#3b82f6] h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${rapport.avancement_global}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => openModal(rapport)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rapport.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {rapport.travaux_realises && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Travaux r\u00e9alis\u00e9s</p>
                              <p className="text-gray-600 line-clamp-2">{rapport.travaux_realises}</p>
                            </div>
                          )}
                          {rapport.travaux_prevus && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Travaux pr\u00e9vus</p>
                              <p className="text-gray-600 line-clamp-2">{rapport.travaux_prevus}</p>
                            </div>
                          )}
                          {!rapport.planning_respecte && rapport.cause_retard && (
                            <div className="md:col-span-2">
                              <p className="font-medium text-red-600 mb-1">\u26a0\ufe0f Retard: {rapport.cause_retard}</p>
                              {rapport.action_engagee && (
                                <p className="text-gray-600">Action: {rapport.action_engagee}</p>
                              )}
                            </div>
                          )}
                          {rapport.risque_livraison && rapport.risque_detail && (
                            <div className="md:col-span-2">
                              <p className="font-medium text-orange-600 mb-1">\u26a0\ufe0f Risque livraison: {rapport.risque_detail}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredRapports.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucun rapport trouv\u00e9</p>
              <p className="text-gray-400 text-sm mt-2">Cr\u00e9ez votre premier rapport hebdomadaire</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1e3a5f]">
                {editingRapport ? 'Modifier le rapport' : 'Nouveau rapport hebdomadaire'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-[#f5f7fa] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">Informations g\u00e9n\u00e9rales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chantier *</label>
                    <select
                      value={formData.chantier_id}
                      onChange={(e) => setFormData({ ...formData, chantier_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    >
                      <option value="">S\u00e9lectionner un chantier</option>
                      {chantiers.map(chantier => (
                        <option key={chantier.id} value={chantier.id}>{chantier.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Semaine du *</label>
                    <input
                      type="date"
                      value={formData.semaine_du}
                      onChange={(e) => setFormData({ ...formData, semaine_du: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Avancement global: {formData.avancement_global}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.avancement_global}
                    onChange={(e) => setFormData({ ...formData, avancement_global: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${formData.avancement_global}%, #e5e7eb ${formData.avancement_global}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
              </div>

              <div className="bg-[#f5f7fa] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">Travaux</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Travaux r\u00e9alis\u00e9s</label>
                    <textarea
                      value={formData.travaux_realises}
                      onChange={(e) => setFormData({ ...formData, travaux_realises: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                      placeholder="D\u00e9crire les travaux r\u00e9alis\u00e9s cette semaine..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Travaux pr\u00e9vus</label>
                    <textarea
                      value={formData.travaux_prevus}
                      onChange={(e) => setFormData({ ...formData, travaux_prevus: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                      placeholder="D\u00e9crire les travaux pr\u00e9vus pour la semaine prochaine..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#f5f7fa] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">Planning</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.planning_respecte}
                      onChange={(e) => setFormData({ ...formData, planning_respecte: e.target.checked })}
                      className="w-4 h-4 text-[#3b82f6] border-gray-300 rounded focus:ring-[#3b82f6]"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Planning respect\u00e9</label>
                  </div>
                  {!formData.planning_respecte && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cause du retard</label>
                        <input
                          type="text"
                          value={formData.cause_retard}
                          onChange={(e) => setFormData({ ...formData, cause_retard: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                          placeholder="Expliquer la cause du retard..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Impact du retard</label>
                        <select
                          value={formData.impact_retard}
                          onChange={(e) => setFormData({ ...formData, impact_retard: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                        >
                          <option value="">S\u00e9lectionner l'impact</option>
                          <option value="aucun">Aucun</option>
                          <option value="leger">L\u00e9ger</option>
                          <option value="important">Important</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Action engag\u00e9e</label>
                        <textarea
                          value={formData.action_engagee}
                          onChange={(e) => setFormData({ ...formData, action_engagee: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                          placeholder="D\u00e9crire les actions engag\u00e9es pour rattraper le retard..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-[#f5f7fa] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">Commandes & Livraisons</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.commandes_passees}
                      onChange={(e) => setFormData({ ...formData, commandes_passees: e.target.checked })}
                      className="w-4 h-4 text-[#3b82f6] border-gray-300 rounded focus:ring-[#3b82f6]"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Commandes pass\u00e9es</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Livraisons re\u00e7ues</label>
                    <textarea
                      value={formData.livraisons_recues}
                      onChange={(e) => setFormData({ ...formData, livraisons_recues: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                      placeholder="Lister les livraisons re\u00e7ues..."
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.risque_livraison}
                      onChange={(e) => setFormData({ ...formData, risque_livraison: e.target.checked })}
                      className="w-4 h-4 text-[#3b82f6] border-gray-300 rounded focus:ring-[#3b82f6]"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Risque de livraison</label>
                  </div>
                  {formData.risque_livraison && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">D\u00e9tail du risque</label>
                      <textarea
                        value={formData.risque_detail}
                        onChange={(e) => setFormData({ ...formData, risque_detail: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                        placeholder="D\u00e9crire le risque de livraison..."
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contraintes d'acc\u00e8s</label>
                    <textarea
                      value={formData.contraintes_acces}
                      onChange={(e) => setFormData({ ...formData, contraintes_acces: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                      placeholder="D\u00e9crire les contraintes d'acc\u00e8s au chantier..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#f5f7fa] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">Observations</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Observations g\u00e9n\u00e9rales</label>
                    <textarea
                      value={formData.observations}
                      onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                      placeholder="Ajouter des observations..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
                    <select
                      value={formData.statut}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    >
                      <option value="brouillon">Brouillon</option>
                      <option value="soumis">Soumis</option>
                      <option value="valide">Valid\u00e9</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Enregistrement...' : editingRapport ? 'Mettre \u00e0 jour' : 'Cr\u00e9er'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RapportsHebdoPage;