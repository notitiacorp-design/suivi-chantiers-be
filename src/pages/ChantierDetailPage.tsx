import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import ChantierHeader from '../components/chantier/ChantierHeader';
import ChantierOverview from '../components/chantier/ChantierOverview';
import ChecklistProcess from '../components/chantier/ChecklistProcess';
import PlanningGantt from '../components/chantier/PlanningGantt';
import JournalChantier from '../components/chantier/JournalChantier';
import { Loader2 } from 'lucide-react';

type TabType = 'overview' | 'checklist' | 'planning' | 'journal' | 'documents' | 'financier' | 'avenants' | 'commandes';

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

const ChantierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    if (!id) return;
    loadChantier();

    // Supabase realtime subscription
    const channel = supabase
      .channel(`chantier-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chantiers',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setChantier(payload.new as Chantier);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const loadChantier = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chantiers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setChantier(data);
    } catch (error: any) {
      toast.error('Erreur lors du chargement du chantier');
      console.error(error);
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

      if (error) throw error;
      toast.success('Chantier mis ÃÂ  jour');
    } catch (error: any) {
      toast.error('Erreur lors de la mise ÃÂ  jour');
      console.error(error);
    }
  };

  const handleExportPDF = async () => {
    toast.loading('Export PDF en cours...');
    // TODO: Implement PDF export logic
    setTimeout(() => {
      toast.dismiss();
      toast.success('PDF exportÃ© avec succÃ¨s');
    }, 1500);
  };

  const handleArchive = async () => {
    if (!window.confirm('ÃÂtes-vous sÃ»r de vouloir archiver ce chantier ?')) return;

    try {
      const { error } = await supabase
        .from('chantiers')
        .update({ statut: 'annule', actif: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Chantier archivÃ©');
      navigate('/chantiers');
    } catch (error: any) {
      toast.error('Erreur lors de l\'archivage');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!chantier) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-600 mb-4">Chantier non trouvÃ©</p>
        <button
          onClick={() => navigate('/chantiers')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retour aux chantiers
        </button>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'planning', label: 'Planning' },
    { id: 'journal', label: 'Journal' },
    { id: 'documents', label: 'Documents' },
    { id: 'financier', label: 'Financier' },
    { id: 'avenants', label: 'Avenants' },
    { id: 'commandes', label: 'Commandes' },
  ];

  const chantierWithMappedFields = {
    ...chantier,
    score_sante: chantier.health_score,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ChantierHeader
        chantier={chantierWithMappedFields}
        onUpdate={handleUpdate}
        onExportPDF={handleExportPDF}
        onArchive={handleArchive}
      />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <ChantierOverview chantier={chantierWithMappedFields} onUpdate={handleUpdate} />
        )}
        {activeTab === 'checklist' && <ChecklistProcess chantierId={chantier.id} />}
        {activeTab === 'planning' && <PlanningGantt chantierId={chantier.id} />}
        {activeTab === 'journal' && <JournalChantier chantierId={chantier.id} />}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Module Documents ÃÂ  venir</p>
          </div>
        )}
        {activeTab === 'financier' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Module Financier ÃÂ  venir</p>
          </div>
        )}
        {activeTab === 'avenants' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Module Avenants ÃÂ  venir</p>
          </div>
        )}
        {activeTab === 'commandes' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Module Commandes ÃÂ  venir</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChantierDetailPage;