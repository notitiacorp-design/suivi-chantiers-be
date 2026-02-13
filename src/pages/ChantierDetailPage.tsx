import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Loader2, Home, FolderKanban, ChevronRight, ClipboardList, Calendar, BookOpen, FileText, Euro, FileSignature, ShoppingCart } from 'lucide-react';
import ChantierHeader from '../components/chantier/ChantierHeader';
import ChantierOverview from '../components/chantier/ChantierOverview';
import ChecklistProcess from '../components/chantier/ChecklistProcess';
import PlanningGantt from '../components/chantier/PlanningGantt';
import JournalChantier from '../components/chantier/JournalChantier';
import DocumentsTab from '../components/chantier/DocumentsTab';
import FinancierTab from '../components/chantier/FinancierTab';
import AvenantsTable from '../components/chantier/AvenantsTable';
import CommandesTable from '../components/chantier/CommandesTable';

interface Chantier {
  id: string;
  nom: string;
  client: string;
  phase: string;
  statut: string;
  health_score: number;
  adresse: string;
  charge_affaires_id: string | null;
  date_debut: string;
  date_fin_prevue: string;
  date_fin_reelle: string | null;
  numero: string;
  code_postal: string | null;
  ville: string | null;
  description: string | null;
  montant_marche: number | null;
  budget_initial: number | null;
  budget_actuel: number | null;
  depenses_actuelles: number | null;
  montant_facture: number | null;
  montant_avenants: number | null;
  avancement_physique: number | null;
  heures_prevues: number | null;
  heures_realisees: number | null;
  taux_facturation: number | null;
  priorite: string | null;
  lots: string[] | null;
  notes: string | null;
  derniere_alerte: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

type TabType = 'overview' | 'checklist' | 'planning' | 'journal' | 'documents' | 'financier' | 'avenants' | 'commandes';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: 'overview', label: "Vue d'ensemble", icon: ClipboardList },
  { id: 'checklist', label: 'Checklist Processus', icon: ClipboardList },
  { id: 'planning', label: 'Planning', icon: Calendar },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'financier', label: 'Financier', icon: Euro },
  { id: 'avenants', label: 'Avenants', icon: FileSignature },
  { id: 'commandes', label: 'Commandes', icon: ShoppingCart }
];

const ChantierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    if (id) {
      fetchChantier();
    }
  }, [id]);

  const fetchChantier = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chantiers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du chantier:', error);
        toast.error('Impossible de charger le chantier');
        navigate('/chantiers');
        return;
      }

      if (!data) {
        toast.error('Chantier introuvable');
        navigate('/chantiers');
        return;
      }

      setChantier(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
      navigate('/chantiers');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<Chantier>) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('chantiers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        toast.error('Erreur lors de la mise à jour');
        return;
      }

      toast.success('Chantier mis à jour avec succès');
      await fetchChantier();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    }
  };

  const handleExportPDF = () => {
    toast.loading('Export PDF en cours...', { duration: 2000 });
    setTimeout(() => {
      toast.success('Export PDF terminé');
    }, 2000);
  };

  const handleArchive = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('chantiers')
        .update({ 
          statut: 'Archivé',
          actif: false,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de l\'archivage:', error);
        toast.error('Erreur lors de l\'archivage');
        return;
      }

      toast.success('Chantier archivé avec succès');
      await fetchChantier();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!chantier) {
    return null;
  }

  const headerChantier = {
    id: chantier.id,
    nom: chantier.nom,
    client: chantier.client,
    phase: chantier.phase,
    statut: chantier.statut,
    health_score: chantier.health_score
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ChantierOverview chantier={chantier} onUpdate={handleUpdate} />;
      case 'checklist':
        return <ChecklistProcess chantierId={chantier.id} />;
      case 'planning':
        return <PlanningGantt chantierId={chantier.id} />;
      case 'journal':
        return <JournalChantier chantierId={chantier.id} />;
      case 'documents':
        return <DocumentsTab chantierId={chantier.id} />;
      case 'financier':
        return <FinancierTab chantierId={chantier.id} />;
      case 'avenants':
        return <AvenantsTable chantierId={chantier.id} />;
      case 'commandes':
        return <CommandesTable chantierId={chantier.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-gray-700 flex items-center">
            <Home className="w-4 h-4" />
            <span className="ml-1">Tableau de bord</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/tous-chantiers" className="hover:text-gray-700 flex items-center">
            <FolderKanban className="w-4 h-4" />
            <span className="ml-1">Chantiers</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">{chantier.nom}</span>
        </nav>

        <ChantierHeader
          chantier={headerChantier}
          onUpdate={handleUpdate}
          onExportPDF={handleExportPDF}
          onArchive={handleArchive}
        />

        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChantierDetailPage;