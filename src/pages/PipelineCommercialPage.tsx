import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Filter,
  TrendingUp,
  Target,
  Award,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  User,
  Building2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
} from 'lucide-react';

interface PipelineDeal {
  id: string;
  nom_affaire: string;
  client: string;
  contact_client?: string;
  telephone?: string;
  email?: string;
  montant_estime: number;
  probabilite: number;
  stade: string;
  source?: string;
  description?: string;
  date_relance?: string;
  date_cloture_prevue?: string;
  commercial_id: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    nom: string;
    prenom: string;
  };
}

interface StageConfig {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const stages: StageConfig[] = [
  { id: 'prospection', label: 'Prospection', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-300' },
  { id: 'decouverte', label: 'Découverte', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  { id: 'proposition', label: 'Proposition', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-300' },
  { id: 'negociation', label: 'Négociation', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' },
  { id: 'gagne', label: 'Gagné', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
  { id: 'perdu', label: 'Perdu', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
];

const sources = [
  'Appel entrant',
  'Site web',
  'Recommandation',
  'Salon professionnel',
  'Prospection directe',
  'Réseaux sociaux',
  'Partenaire',
  'Autre',
];

export default function PipelineCommercialPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<PipelineDeal | null>(null);
  const [selectedCommercial, setSelectedCommercial] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [showLostDeals, setShowLostDeals] = useState(false);
  const [formData, setFormData] = useState({
    nom_affaire: '',
    client: '',
    contact_client: '',
    telephone: '',
    email: '',
    montant_estime: '',
    probabilite: 50,
    stade: 'prospection',
    source: '',
    description: '',
    date_relance: '',
    date_cloture_prevue: '',
  });

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['pipeline_commercial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_commercial')
        .select('*, profiles:commercial_id(nom, prenom)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PipelineDeal[];
    },
  });

  const { data: commercials = [] } = useQuery({
    queryKey: ['commercials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nom, prenom')
        .eq('role', 'commercial');

      if (error) throw error;
      return data;
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (newDeal: any) => {
      const { data, error } = await supabase
        .from('pipeline_commercial')
        .insert([{ ...newDeal, commercial_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline_commercial'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('pipeline_commercial')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline_commercial'] });
      setIsModalOpen(false);
      setEditingDeal(null);
      resetForm();
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pipeline_commercial')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline_commercial'] });
    },
  });

  const filteredDeals = useMemo(() => {
    let filtered = deals;

    if (selectedCommercial !== 'all') {
      filtered = filtered.filter((deal) => deal.commercial_id === selectedCommercial);
    }

    if (selectedStage !== 'all') {
      filtered = filtered.filter((deal) => deal.stade === selectedStage);
    }

    return filtered;
  }, [deals, selectedCommercial, selectedStage]);

  const stats = useMemo(() => {
    const activeDeals = filteredDeals.filter((d) => d.stade !== 'gagne' && d.stade !== 'perdu');
    const totalValue = activeDeals.reduce((sum, deal) => sum + deal.montant_estime, 0);
    const weightedValue = activeDeals.reduce((sum, deal) => sum + (deal.montant_estime * deal.probabilite) / 100, 0);
    const wonDeals = deals.filter((d) => d.stade === 'gagne').length;
    const lostDeals = deals.filter((d) => d.stade === 'perdu').length;
    const totalClosed = wonDeals + lostDeals;
    const winRate = totalClosed > 0 ? (wonDeals / totalClosed) * 100 : 0;

    return {
      totalValue,
      weightedValue,
      winRate,
      activeDealsCount: activeDeals.length,
    };
  }, [filteredDeals, deals]);

  const dealsByStage = useMemo(() => {
    const grouped: Record<string, PipelineDeal[]> = {};
    stages.forEach((stage) => {
      grouped[stage.id] = filteredDeals.filter((deal) => deal.stade === stage.id);
    });
    return grouped;
  }, [filteredDeals]);

  const resetForm = () => {
    setFormData({
      nom_affaire: '',
      client: '',
      contact_client: '',
      telephone: '',
      email: '',
      montant_estime: '',
      probabilite: 50,
      stade: 'prospection',
      source: '',
      description: '',
      date_relance: '',
      date_cloture_prevue: '',
    });
    setEditingDeal(null);
  };

  const handleOpenModal = (deal?: PipelineDeal) => {
    if (deal) {
      setEditingDeal(deal);
      setFormData({
        nom_affaire: deal.nom_affaire,
        client: deal.client,
        contact_client: deal.contact_client || '',
        telephone: deal.telephone || '',
        email: deal.email || '',
        montant_estime: deal.montant_estime.toString(),
        probabilite: deal.probabilite,
        stade: deal.stade,
        source: deal.source || '',
        description: deal.description || '',
        date_relance: deal.date_relance || '',
        date_cloture_prevue: deal.date_cloture_prevue || '',
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dealData = {
      nom_affaire: formData.nom_affaire,
      client: formData.client,
      contact_client: formData.contact_client || null,
      telephone: formData.telephone || null,
      email: formData.email || null,
      montant_estime: parseFloat(formData.montant_estime),
      probabilite: formData.probabilite,
      stade: formData.stade,
      source: formData.source || null,
      description: formData.description || null,
      date_relance: formData.date_relance || null,
      date_cloture_prevue: formData.date_cloture_prevue || null,
    };

    if (editingDeal) {
      updateDealMutation.mutate({ id: editingDeal.id, updates: dealData });
    } else {
      createDealMutation.mutate(dealData);
    }
  };

  const handleStageChange = (dealId: string, newStage: string) => {
    updateDealMutation.mutate({
      id: dealId,
      updates: { stade: newStage },
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const isOverdue = (date: string | undefined) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pipeline Commercial</h1>
            <p className="mt-1 text-sm text-gray-600">Gestion des opportunités commerciales</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nouvelle affaire
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valeur totale</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valeur pondérée</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.weightedValue)}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de conversion</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.winRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Affaires en cours</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeDealsCount}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtres :</span>
            </div>

            <select
              value={selectedCommercial}
              onChange={(e) => setSelectedCommercial(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les commerciaux</option>
              {commercials.map((commercial) => (
                <option key={commercial.id} value={commercial.id}>
                  {commercial.prenom} {commercial.nom}
                </option>
              ))}
            </select>

            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les stades</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLostDeals}
                onChange={(e) => setShowLostDeals(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Afficher les affaires perdues</span>
            </label>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages
            .filter((stage) => stage.id !== 'perdu' || showLostDeals)
            .map((stage) => {
              const stageDeals = dealsByStage[stage.id] || [];
              const stageValue = stageDeals.reduce((sum, deal) => sum + deal.montant_estime, 0);

              return (
                <div key={stage.id} className="flex-shrink-0 w-80">
                  <div className={`${stage.bgColor} rounded-t-xl p-4 border-t-4 ${stage.borderColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold ${stage.color}`}>{stage.label}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stage.color} ${stage.bgColor}`}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${stage.color}`}>{formatCurrency(stageValue)}</p>
                  </div>

                  <div className="bg-gray-100 rounded-b-xl p-4 min-h-[500px] space-y-3">
                    {stageDeals.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Aucune affaire</div>
                    ) : (
                      stageDeals.map((deal) => (
                        <div
                          key={deal.id}
                          className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 text-sm flex-1">{deal.nom_affaire}</h4>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleOpenModal(deal)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Edit2 className="w-4 h-4 text-gray-500" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Ãtes-vous sûr de vouloir supprimer cette affaire ?')) {
                                    deleteDealMutation.mutate(deal.id);
                                  }
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                            <Building2 className="w-3 h-3" />
                            <span>{deal.client}</span>
                          </div>

                          {deal.contact_client && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                              <User className="w-3 h-3" />
                              <span>{deal.contact_client}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-blue-600">{formatCurrency(deal.montant_estime)}</span>
                            {deal.profiles && (
                              <span className="text-xs text-gray-500">
                                {deal.profiles.prenom} {deal.profiles.nom}
                              </span>
                            )}
                          </div>

                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Probabilité</span>
                              <span className="font-medium">{deal.probabilite}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${deal.probabilite}%` }}
                              ></div>
                            </div>
                          </div>

                          {deal.date_relance && (
                            <div
                              className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                                isOverdue(deal.date_relance)
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Relance : {formatDate(deal.date_relance)}</span>
                              {isOverdue(deal.date_relance) && <AlertCircle className="w-3 h-3 ml-auto" />}
                            </div>
                          )}

                          <select
                            value={deal.stade}
                            onChange={(e) => handleStageChange(deal.id, e.target.value)}
                            className="mt-3 w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {stages.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingDeal ? 'Modifier l\'affaire' : 'Nouvelle affaire'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'affaire *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom_affaire}
                    onChange={(e) => setFormData({ ...formData, nom_affaire: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Rénovation immeuble centre-ville"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <input
                    type="text"
                    required
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom de l'entreprise"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact client</label>
                  <input
                    type="text"
                    value={formData.contact_client}
                    onChange={(e) => setFormData({ ...formData, contact_client: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom du contact"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="06 12 34 56 78"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contact@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant estimé (â¬) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.montant_estime}
                    onChange={(e) => setFormData({ ...formData, montant_estime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stade</label>
                  <select
                    value={formData.stade}
                    onChange={(e) => setFormData({ ...formData, stade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Probabilité de succès : {formData.probabilite}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.probabilite}
                    onChange={(e) => setFormData({ ...formData, probabilite: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une source</option>
                    {sources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de relance</label>
                  <input
                    type="date"
                    value={formData.date_relance}
                    onChange={(e) => setFormData({ ...formData, date_relance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de clôture prévue
                  </label>
                  <input
                    type="date"
                    value={formData.date_cloture_prevue}
                    onChange={(e) => setFormData({ ...formData, date_cloture_prevue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Détails de l'affaire, besoins du client, etc."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createDealMutation.isPending || updateDealMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createDealMutation.isPending || updateDealMutation.isPending
                    ? 'Enregistrement...'
                    : editingDeal
                    ? 'Mettre à jour'
                    : 'Créer l\'affaire'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}