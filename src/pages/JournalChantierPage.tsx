import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Filter,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Package,
  UserCheck,
  Calendar,
  X,
  Thermometer,
} from 'lucide-react';

interface JournalEntry {
  id: string;
  date_journal: string;
  chantier_id: string;
  meteo: 'ensoleille' | 'nuageux' | 'pluie' | 'orage' | 'neige';
  temperature_min?: number;
  temperature_max?: number;
  effectif_total: number;
  heures_travaillees: number;
  travaux_realises: string;
  travaux_prevus_lendemain?: string;
  observations?: string;
  problemes?: string;
  decisions?: string;
  materiaux_recus?: string;
  visiteurs?: string;
  securite_incidents?: string;
  auteur_id: string;
  created_at: string;
  chantiers?: {
    nom: string;
  };
  profiles?: {
    nom: string;
    prenom: string;
  };
}

interface Chantier {
  id: string;
  nom: string;
}

const weatherIcons = {
  ensoleille: Sun,
  nuageux: Cloud,
  pluie: CloudRain,
  orage: CloudLightning,
  neige: Snowflake,
};

const weatherLabels = {
  ensoleille: 'Ensoleillé',
  nuageux: 'Nuageux',
  pluie: 'Pluie',
  orage: 'Orage',
  neige: 'Neige',
};

const JournalChantierPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: {
      observations?: boolean;
      problemes?: boolean;
      decisions?: boolean;
      materiaux?: boolean;
      visiteurs?: boolean;
    };
  }>({});

  const [formData, setFormData] = useState({
    date_journal: new Date().toISOString().split('T')[0],
    chantier_id: '',
    meteo: 'ensoleille' as const,
    temperature_min: '',
    temperature_max: '',
    effectif_total: '',
    heures_travaillees: '',
    travaux_realises: '',
    travaux_prevus_lendemain: '',
    observations: '',
    problemes: '',
    decisions: '',
    materiaux_recus: '',
    visiteurs: '',
    securite_incidents: '',
  });

  const { data: chantiers = [], isLoading: chantiersLoading } = useQuery({
    queryKey: ['chantiers-actifs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chantiers')
        .select('id, nom')
        .eq('actif', true)
        .order('nom');
      if (error) throw error;
      return data as Chantier[];
    },
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['journal-chantier', selectedChantier, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('journal_chantier')
        .select('*, chantiers(nom), profiles:auteur_id(nom, prenom)')
        .order('date_journal', { ascending: false });

      if (selectedChantier) {
        query = query.eq('chantier_id', selectedChantier);
      }

      if (startDate) {
        query = query.gte('date_journal', startDate);
      }

      if (endDate) {
        query = query.lte('date_journal', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as JournalEntry[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newEntry: any) => {
      const { data, error } = await supabase
        .from('journal_chantier')
        .insert([{ ...newEntry, auteur_id: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-chantier'] });
      setShowModal(false);
      setFormData({
        date_journal: new Date().toISOString().split('T')[0],
        chantier_id: '',
        meteo: 'ensoleille',
        temperature_min: '',
        temperature_max: '',
        effectif_total: '',
        heures_travaillees: '',
        travaux_realises: '',
        travaux_prevus_lendemain: '',
        observations: '',
        problemes: '',
        decisions: '',
        materiaux_recus: '',
        visiteurs: '',
        securite_incidents: '',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      date_journal: formData.date_journal,
      chantier_id: formData.chantier_id,
      meteo: formData.meteo,
      effectif_total: parseInt(formData.effectif_total),
      heures_travaillees: parseFloat(formData.heures_travaillees),
      travaux_realises: formData.travaux_realises,
    };

    if (formData.temperature_min) payload.temperature_min = parseFloat(formData.temperature_min);
    if (formData.temperature_max) payload.temperature_max = parseFloat(formData.temperature_max);
    if (formData.travaux_prevus_lendemain) payload.travaux_prevus_lendemain = formData.travaux_prevus_lendemain;
    if (formData.observations) payload.observations = formData.observations;
    if (formData.problemes) payload.problemes = formData.problemes;
    if (formData.decisions) payload.decisions = formData.decisions;
    if (formData.materiaux_recus) payload.materiaux_recus = formData.materiaux_recus;
    if (formData.visiteurs) payload.visiteurs = formData.visiteurs;
    if (formData.securite_incidents) payload.securite_incidents = formData.securite_incidents;

    createMutation.mutate(payload);
  };

  const toggleSection = (entryId: string, section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [section]: !prev[entryId]?.[section as keyof typeof prev[typeof entryId]],
      },
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">Journal de Chantier</h1>
          <p className="text-[#64748b]">Suivi quotidien des activités de chantier</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1e293b] mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Filtrer par chantier
              </label>
              <select
                value={selectedChantier}
                onChange={(e) => setSelectedChantier(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              >
                <option value="">Tous les chantiers</option>
                {chantiers.map((chantier) => (
                  <option key={chantier.id} value={chantier.id}>
                    {chantier.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1e293b] mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date de début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1e293b] mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date de fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Nouvelle entrée
            </button>
          </div>
        </div>

        {entriesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-[#64748b] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#1e293b] mb-2">Aucune entrée trouvée</h3>
            <p className="text-[#64748b] mb-6">Créez votre première entrée de journal de chantier</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nouvelle entrée
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {entries.map((entry) => {
              const WeatherIcon = weatherIcons[entry.meteo];
              return (
                <div key={entry.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 pb-4 border-b border-gray-200">
                      <div>
                        <h2 className="text-xl font-bold text-[#1e3a5f] mb-1">
                          {formatDate(entry.date_journal)}
                        </h2>
                        <p className="text-[#64748b]">{entry.chantiers?.nom}</p>
                      </div>

                      <div className="flex items-center gap-6 mt-4 lg:mt-0">
                        <div className="flex items-center gap-2">
                          <WeatherIcon className="w-6 h-6 text-[#3b82f6]" />
                          <span className="text-sm text-[#64748b]">{weatherLabels[entry.meteo]}</span>
                        </div>
                        {(entry.temperature_min !== null || entry.temperature_max !== null) && (
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-5 h-5 text-[#f59e0b]" />
                            <span className="text-sm text-[#64748b]">
                              {entry.temperature_min !== null && entry.temperature_min !== undefined ? `${entry.temperature_min}°` : '--'}
                              {' / '}
                              {entry.temperature_max !== null && entry.temperature_max !== undefined ? `${entry.temperature_max}°` : '--'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-[#10b981]" />
                          <span className="text-sm text-[#64748b]">{entry.effectif_total} personnes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-[#3b82f6]" />
                          <span className="text-sm text-[#64748b]">{entry.heures_travaillees}h</span>
                        </div>
                      </div>
                    </div>

                    {entry.securite_incidents && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-[#ef4444] mb-1">Incidents de sécurité</h4>
                            <p className="text-sm text-[#1e293b] whitespace-pre-wrap">{entry.securite_incidents}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-[#1e3a5f] mb-2">Travaux réalisés</h3>
                        <p className="text-[#1e293b] whitespace-pre-wrap">{entry.travaux_realises}</p>
                      </div>

                      {entry.travaux_prevus_lendemain && (
                        <div>
                          <h3 className="font-semibold text-[#1e3a5f] mb-2">Travaux prévus pour le lendemain</h3>
                          <p className="text-[#1e293b] whitespace-pre-wrap">{entry.travaux_prevus_lendemain}</p>
                        </div>
                      )}

                      {entry.observations && (
                        <div className="border-t border-gray-200 pt-4">
                          <button
                            onClick={() => toggleSection(entry.id, 'observations')}
                            className="flex items-center justify-between w-full text-left font-semibold text-[#1e3a5f] hover:text-[#3b82f6] transition-colors"
                          >
                            <span>Observations</span>
                            {expandedSections[entry.id]?.observations ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                          {expandedSections[entry.id]?.observations && (
                            <p className="text-[#1e293b] mt-2 whitespace-pre-wrap">{entry.observations}</p>
                          )}
                        </div>
                      )}

                      {entry.problemes && (
                        <div className="border-t border-gray-200 pt-4">
                          <button
                            onClick={() => toggleSection(entry.id, 'problemes')}
                            className="flex items-center justify-between w-full text-left font-semibold text-[#1e3a5f] hover:text-[#3b82f6] transition-colors"
                          >
                            <span>Problèmes rencontrés</span>
                            {expandedSections[entry.id]?.problemes ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                          {expandedSections[entry.id]?.problemes && (
                            <p className="text-[#1e293b] mt-2 whitespace-pre-wrap">{entry.problemes}</p>
                          )}
                        </div>
                      )}

                      {entry.decisions && (
                        <div className="border-t border-gray-200 pt-4">
                          <button
                            onClick={() => toggleSection(entry.id, 'decisions')}
                            className="flex items-center justify-between w-full text-left font-semibold text-[#1e3a5f] hover:text-[#3b82f6] transition-colors"
                          >
                            <span>Décisions prises</span>
                            {expandedSections[entry.id]?.decisions ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                          {expandedSections[entry.id]?.decisions && (
                            <p className="text-[#1e293b] mt-2 whitespace-pre-wrap">{entry.decisions}</p>
                          )}
                        </div>
                      )}

                      {entry.materiaux_recus && (
                        <div className="border-t border-gray-200 pt-4">
                          <button
                            onClick={() => toggleSection(entry.id, 'materiaux')}
                            className="flex items-center justify-between w-full text-left font-semibold text-[#1e3a5f] hover:text-[#3b82f6] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Package className="w-5 h-5" />
                              <span>Matériaux reçus</span>
                            </div>
                            {expandedSections[entry.id]?.materiaux ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                          {expandedSections[entry.id]?.materiaux && (
                            <p className="text-[#1e293b] mt-2 whitespace-pre-wrap">{entry.materiaux_recus}</p>
                          )}
                        </div>
                      )}

                      {entry.visiteurs && (
                        <div className="border-t border-gray-200 pt-4">
                          <button
                            onClick={() => toggleSection(entry.id, 'visiteurs')}
                            className="flex items-center justify-between w-full text-left font-semibold text-[#1e3a5f] hover:text-[#3b82f6] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-5 h-5" />
                              <span>Visiteurs</span>
                            </div>
                            {expandedSections[entry.id]?.visiteurs ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                          {expandedSections[entry.id]?.visiteurs && (
                            <p className="text-[#1e293b] mt-2 whitespace-pre-wrap">{entry.visiteurs}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-[#64748b]">
                      <span>
                        Rédigé par {entry.profiles?.prenom} {entry.profiles?.nom}
                      </span>
                      <span>{formatDateTime(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1e3a5f]">Nouvelle entrée de journal</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#64748b] hover:text-[#1e293b] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#1e293b] mb-2">
                    Date <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date_journal}
                    onChange={(e) => setFormData({ ...formData, date_journal: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1e293b] mb-2">
                    Chantier <span className="text-[#ef4444]">*</span>
                  </label>
                  <select
                    required
                    value={formData.chantier_id}
                    onChange={(e) => setFormData({ ...formData, chantier_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                  >
                    <option value="">Sélectionner un chantier</option>
                    {chantiers.map((chantier) => (
                      <option key={chantier.id} value={chantier.id}>
                        {chantier.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">
                  Météo <span className="text-[#ef4444]">*</span>
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {(Object.entries(weatherIcons) as [keyof typeof weatherIcons, any][]).map(([key, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, meteo: key })}
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all ${
                        formData.meteo === key
                          ? 'border-[#3b82f6] bg-blue-50'
                          : 'border-gray-300 hover:border-[#3b82f6]'
                      }`}
                    >
                      <Icon className="w-8 h-8" />
                      <span className="text-sm">{weatherLabels[key]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#1e293b] mb-2">
                    Température min (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temperature_min}
                    onChange={(e) => setFormData({ ...formData, temperature_min: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                    placeholder="Ex: 12.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1e293b] mb-2">
                    Température max (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temperature_max}
                    onChange={(e) => setFormData({ ...formData, temperature_max: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                    placeholder="Ex: 22.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#1e293b] mb-2">
                    Effectif total <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.effectif_total}
                    onChange={(e) => setFormData({ ...formData, effectif_total: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                    placeholder="Nombre de personnes"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1e293b] mb-2">
                    Heures travaillées <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    value={formData.heures_travaillees}
                    onChange={(e) => setFormData({ ...formData, heures_travaillees: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                    placeholder="Ex: 8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">
                  Travaux réalisés <span className="text-[#ef4444]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.travaux_realises}
                  onChange={(e) => setFormData({ ...formData, travaux_realises: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent resize-none"
                  placeholder="Décrivez les travaux effectués aujourd'hui..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">
                  Travaux prévus pour le lendemain
                </label>
                <textarea
                  rows={3}
                  value={formData.travaux_prevus_lendemain}
                  onChange={(e) => setFormData({ ...formData, travaux_prevus_lendemain: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent resize-none"
                  placeholder="Décrivez les travaux prévus..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">
                  Observations
                </label>
                <textarea
                  rows={3}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent resize-none"
                  placeholder="Observations générales..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">
                  Problèmes rencontrés
                </label>
                <textarea
                  rows={3}
                  value={formData.problemes}
                  onChange={(e) => setFormData({ ...formData, problemes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent resize-none"
                  placeholder="Décrivez les problèmes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">
                  Décisions prises
                </label>
                <textarea
                  rows={3}
                  value={formData.decisions}
                  onChange={(e) => setFormData({ ...formData, decisions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent resize-none"
                  placeholder="Listez les décisions..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">
                  Matériaux reçus
                </label>
                <textarea
                  rows={3}
                  value={formData.materiaux_recus}
                  onChange={(e) => setFormData({ ...formData, materiaux_recus: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent resize-none"
                  placeholder="Listez les matériaux..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">
                  Visiteurs
                </label>
                <textarea
                  rows={2}
                  value={formData.visiteurs}
                  onChange={(e) => setFormData({ ...formData, visiteurs: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent resize-none"
                  placeholder="Noms et fonctions des visiteurs..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-2">
                  Incidents de sécurité
                </label>
                <textarea
                  rows={3}
                  value={formData.securite_incidents}
                  onChange={(e) => setFormData({ ...formData, securite_incidents: e.target.value })}
                  className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-[#ef4444] focus:border-transparent resize-none"
                  placeholder="Décrivez tout incident de sécurité..."
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-[#1e293b] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-6 py-3 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalChantierPage;