import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  ShoppingCart,
  Package,
  Calendar,
  Euro,
  X,
  Save,
  Edit2,
  Trash2,
  FileText,
  Building2,
  User,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface Achat {
  id: string;
  numero_bon: string;
  chantier_id: string;
  fournisseur: string;
  description: string;
  categorie: 'materiel' | 'equipement' | 'sous_traitance' | 'divers';
  montant_ht: number;
  montant_ttc: number;
  statut: 'brouillon' | 'en_attente_validation' | 'validee' | 'commandee' | 'livree' | 'recue' | 'annulee';
  date_commande: string;
  date_livraison_prevue: string | null;
  date_livraison_reelle: string | null;
  demandeur_id: string;
  created_at: string;
  chantiers?: { nom: string };
  profiles?: { nom: string; prenom: string };
}

interface Chantier {
  id: string;
  nom: string;
  numero: string;
}

interface AchatFormData {
  numero_bon: string;
  chantier_id: string;
  fournisseur: string;
  description: string;
  categorie: 'materiel' | 'equipement' | 'sous_traitance' | 'divers';
  montant_ht: number;
  date_livraison_prevue: string;
  statut: 'brouillon' | 'en_attente_validation' | 'validee' | 'commandee' | 'livree' | 'recue' | 'annulee';
}

const statusConfig = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  en_attente_validation: { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  validee: { label: 'ValidÃ©e', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  commandee: { label: 'CommandÃ©e', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  livree: { label: 'LivrÃ©e', color: 'bg-green-100 text-green-700 border-green-200' },
  recue: { label: 'ReÃ§ue', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  annulee: { label: 'AnnulÃ©e', color: 'bg-red-100 text-red-700 border-red-200' },
};

const categorieLabels = {
  materiel: 'MatÃ©riel',
  equipement: 'Ãquipement',
  sous_traitance: 'Sous-traitance',
  divers: 'Divers',
};

const AchatsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChantier, setSelectedChantier] = useState<string>('all');
  const [selectedFournisseur, setSelectedFournisseur] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingAchat, setEditingAchat] = useState<Achat | null>(null);
  const [formData, setFormData] = useState<AchatFormData>({
    numero_bon: '',
    chantier_id: '',
    fournisseur: '',
    description: '',
    categorie: 'materiel',
    montant_ht: 0,
    date_livraison_prevue: '',
    statut: 'brouillon',
  });

  const { data: achats = [], isLoading: achatsLoading } = useQuery({
    queryKey: ['achats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achats')
        .select('*, chantiers(nom), profiles:demandeur_id(nom, prenom)')
        .order('date_commande', { ascending: false });
      if (error) throw error;
      return data as Achat[];
    },
  });

  const { data: chantiers = [] } = useQuery({
    queryKey: ['chantiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chantiers')
        .select('id, nom, numero')
        .eq('statut', 'en_cours')
        .order('nom');
      if (error) throw error;
      return data as Chantier[];
    },
  });

  const createAchatMutation = useMutation({
    mutationFn: async (data: AchatFormData) => {
      const montant_ttc = data.montant_ht * 1.2;
      const { data: result, error } = await supabase
        .from('achats')
        .insert([{
          ...data,
          montant_ttc,
          date_commande: new Date().toISOString().split('T')[0],
          demandeur_id: user?.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achats'] });
      setShowModal(false);
      resetForm();
    },
  });

  const updateAchatMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AchatFormData> }) => {
      const updateData: any = { ...data };
      if (data.montant_ht !== undefined) {
        updateData.montant_ttc = data.montant_ht * 1.2;
      }
      const { data: result, error } = await supabase
        .from('achats')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achats'] });
      setShowModal(false);
      setShowDetailModal(false);
      setEditingAchat(null);
      resetForm();
    },
  });

  const deleteAchatMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('achats').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achats'] });
      setShowDetailModal(false);
      setEditingAchat(null);
    },
  });

  const filteredAchats = useMemo(() => {
    return achats.filter((achat) => {
      const matchesSearch =
        searchTerm === '' ||
        achat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        achat.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
        achat.numero_bon.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesChantier = selectedChantier === 'all' || achat.chantier_id === selectedChantier;
      const matchesFournisseur = selectedFournisseur === 'all' || achat.fournisseur === selectedFournisseur;
      const matchesStatut = selectedStatut === 'all' || achat.statut === selectedStatut;
      const matchesCategorie = selectedCategorie === 'all' || achat.categorie === selectedCategorie;
      return matchesSearch && matchesChantier && matchesFournisseur && matchesStatut && matchesCategorie;
    });
  }, [achats, searchTerm, selectedChantier, selectedFournisseur, selectedStatut, selectedCategorie]);

  const fournisseurs = useMemo(() => {
    const uniqueFournisseurs = Array.from(new Set(achats.map((a) => a.fournisseur)));
    return uniqueFournisseurs.sort();
  }, [achats]);

  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const achatsEnCours = achats.filter(
      (a) => ['validee', 'commandee', 'livree'].includes(a.statut)
    );
    const totalEnCours = achatsEnCours.reduce((sum, a) => sum + a.montant_ttc, 0);
    const budgetEngage = achats
      .filter((a) => a.statut !== 'annulee')
      .reduce((sum, a) => sum + a.montant_ttc, 0);
    const livraisonsEnAttente = achats.filter(
      (a) => ['commandee'].includes(a.statut)
    ).length;
    const commandesDuMois = achats.filter((a) => {
      const date = new Date(a.date_commande);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    return {
      totalEnCours,
      budgetEngage,
      livraisonsEnAttente,
      commandesDuMois,
    };
  }, [achats]);

  const generateNumeroBon = () => {
    const year = new Date().getFullYear();
    const existingBons = achats
      .filter((a) => a.numero_bon.startsWith(`BC-${year}-`))
      .map((a) => {
        const parts = a.numero_bon.split('-');
        return parseInt(parts[2], 10);
      })
      .filter((n) => !isNaN(n));
    const maxNum = existingBons.length > 0 ? Math.max(...existingBons) : 0;
    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    return `BC-${year}-${nextNum}`;
  };

  const resetForm = () => {
    setFormData({
      numero_bon: '',
      chantier_id: '',
      fournisseur: '',
      description: '',
      categorie: 'materiel',
      montant_ht: 0,
      date_livraison_prevue: '',
      statut: 'brouillon',
    });
    setEditingAchat(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setFormData((prev) => ({ ...prev, numero_bon: generateNumeroBon() }));
    setShowModal(true);
  };

  const handleOpenDetailModal = (achat: Achat) => {
    setEditingAchat(achat);
    setFormData({
      numero_bon: achat.numero_bon,
      chantier_id: achat.chantier_id,
      fournisseur: achat.fournisseur,
      description: achat.description,
      categorie: achat.categorie,
      montant_ht: achat.montant_ht,
      date_livraison_prevue: achat.date_livraison_prevue || '',
      statut: achat.statut,
    });
    setShowDetailModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAchat) {
      updateAchatMutation.mutate({ id: editingAchat.id, data: formData });
    } else {
      createAchatMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (editingAchat && window.confirm('Ãtes-vous sÃ»r de vouloir supprimer ce bon de commande ?')) {
      deleteAchatMutation.mutate(editingAchat.id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestion des Achats</h1>
              <p className="text-slate-600 mt-1">Suivi des bons de commande et approvisionnements</p>
            </div>
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Nouveau bon de commande
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-slate-600 mb-1">Total achats en cours</h3>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.totalEnCours)}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Euro className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-slate-600 mb-1">Budget engagÃ©</h3>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.budgetEngage)}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-amber-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-slate-600 mb-1">Livraisons en attente</h3>
            <p className="text-2xl font-bold text-slate-900">{kpis.livraisonsEnAttente}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-slate-600 mb-1">Commandes du mois</h3>
            <p className="text-2xl font-bold text-slate-900">{kpis.commandesDuMois}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Rechercher
              </label>
              <input
                type="text"
                placeholder="Description, fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Chantier
              </label>
              <select
                value={selectedChantier}
                onChange={(e) => setSelectedChantier(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les chantiers</option>
                {chantiers.map((chantier) => (
                  <option key={chantier.id} value={chantier.id}>
                    {chantier.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Fournisseur
              </label>
              <select
                value={selectedFournisseur}
                onChange={(e) => setSelectedFournisseur(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les fournisseurs</option>
                {fournisseurs.map((fournisseur) => (
                  <option key={fournisseur} value={fournisseur}>
                    {fournisseur}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                CatÃ©gorie
              </label>
              <select
                value={selectedCategorie}
                onChange={(e) => setSelectedCategorie(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes les catÃ©gories</option>
                {Object.entries(categorieLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Statut
              </label>
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    NÂ° Bon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Fournisseur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Chantier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    CatÃ©gorie
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Montant HT
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Montant TTC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Date commande
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Livraison prÃ©vue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Livraison rÃ©elle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {achatsLoading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                      Chargement...
                    </td>
                  </tr>
                ) : filteredAchats.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                      Aucun achat trouvÃ©
                    </td>
                  </tr>
                ) : (
                  filteredAchats.map((achat) => (
                    <tr
                      key={achat.id}
                      onClick={() => handleOpenDetailModal(achat)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {achat.numero_bon}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{achat.fournisseur}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 max-w-xs truncate">
                        {achat.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {achat.chantiers?.nom || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {categorieLabels[achat.categorie]}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                        {formatCurrency(achat.montant_ht)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                        {formatCurrency(achat.montant_ttc)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[achat.statut].color}`}
                        >
                          {statusConfig[achat.statut].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatDate(achat.date_commande)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatDate(achat.date_livraison_prevue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatDate(achat.date_livraison_reelle)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingAchat ? 'Modifier le bon de commande' : 'Nouveau bon de commande'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    NumÃ©ro de bon
                  </label>
                  <input
                    type="text"
                    value={formData.numero_bon}
                    onChange={(e) => setFormData({ ...formData, numero_bon: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Chantier *
                  </label>
                  <select
                    value={formData.chantier_id}
                    onChange={(e) => setFormData({ ...formData, chantier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">SÃ©lectionner un chantier</option>
                    {chantiers.map((chantier) => (
                      <option key={chantier.id} value={chantier.id}>
                        {chantier.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fournisseur *
                  </label>
                  <input
                    type="text"
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    CatÃ©gorie *
                  </label>
                  <select
                    value={formData.categorie}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categorie: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {Object.entries(categorieLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Statut *
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statut: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Montant HT (â¬) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.montant_ht}
                    onChange={(e) =>
                      setFormData({ ...formData, montant_ht: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Montant TTC (â¬)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(formData.montant_ht * 1.2)}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date de livraison prÃ©vue
                  </label>
                  <input
                    type="date"
                    value={formData.date_livraison_prevue}
                    onChange={(e) =>
                      setFormData({ ...formData, date_livraison_prevue: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createAchatMutation.isPending || updateAchatMutation.isPending}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {editingAchat ? 'Modifier' : 'CrÃ©er'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && editingAchat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">DÃ©tails du bon de commande</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setEditingAchat(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-slate-500">NumÃ©ro de bon</label>
                  <p className="text-lg font-semibold text-slate-900 mt-1">
                    {editingAchat.numero_bon}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Statut</label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${statusConfig[editingAchat.statut].color}`}
                    >
                      {statusConfig[editingAchat.statut].label}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Chantier</label>
                  <p className="text-base text-slate-900 mt-1">
                    {editingAchat.chantiers?.nom || '-'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Fournisseur</label>
                  <p className="text-base text-slate-900 mt-1">{editingAchat.fournisseur}</p>
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium text-slate-500">Description</label>
                  <p className="text-base text-slate-900 mt-1">{editingAchat.description}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">CatÃ©gorie</label>
                  <p className="text-base text-slate-900 mt-1">
                    {categorieLabels[editingAchat.categorie]}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Demandeur</label>
                  <p className="text-base text-slate-900 mt-1">
                    {editingAchat.profiles
                      ? `${editingAchat.profiles.prenom} ${editingAchat.profiles.nom}`
                      : '-'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Montant HT</label>
                  <p className="text-lg font-semibold text-slate-900 mt-1">
                    {formatCurrency(editingAchat.montant_ht)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Montant TTC</label>
                  <p className="text-lg font-semibold text-slate-900 mt-1">
                    {formatCurrency(editingAchat.montant_ttc)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Date de commande</label>
                  <p className="text-base text-slate-900 mt-1">
                    {formatDate(editingAchat.date_commande)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Livraison prÃ©vue</label>
                  <p className="text-base text-slate-900 mt-1">
                    {formatDate(editingAchat.date_livraison_prevue)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Livraison rÃ©elle</label>
                  <p className="text-base text-slate-900 mt-1">
                    {formatDate(editingAchat.date_livraison_reelle)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Date de crÃ©ation</label>
                  <p className="text-base text-slate-900 mt-1">
                    {formatDate(editingAchat.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleDelete}
                  disabled={deleteAchatMutation.isPending}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifier
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AchatsPage;