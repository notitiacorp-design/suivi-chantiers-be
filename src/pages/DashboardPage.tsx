import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ChantierMiniCard from '@/components/dashboard/ChantierMiniCard';
import KPICard from '@/components/dashboard/KPICard';
import { ChartBarIcon, ExclamationTriangleIcon, CurrencyEuroIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Chantier {
  id: string;
  nom: string;
  numero: string;
  client: string;
  phase: 'etude' | 'preparation' | 'execution' | 'reception' | 'garantie';
  statut: 'en_attente' | 'en_cours' | 'termine' | 'suspendu' | 'annule';
  health_score: number;
  avancement_physique: number;
  budget_initial: number;
  budget_actuel: number;
  montant_marche: number;
  depenses_actuelles: number;
  charge_affaires_id: string;
  date_debut: string;
  date_fin_prevue: string;
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';
}

const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalChantiers: 0,
    avgHealthScore: 0,
    totalBudget: 0,
    alertsCount: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        let query = supabase
          .from('chantiers')
          .select('*')
          .in('statut', ['en_attente', 'en_cours', 'suspendu']);

        if (profile?.role === 'charge_affaires') {
          query = query.eq('charge_affaires_id', profile.id);
        }

        const { data, error } = await query.order('date_debut', { ascending: false });

        if (error) throw error;

        const chantiersData = data as Chantier[];
        setChantiers(chantiersData);

        const totalChantiers = chantiersData.length;
        const avgHealthScore = totalChantiers > 0
          ? chantiersData.reduce((sum, c) => sum + (c.health_score || 0), 0) / totalChantiers
          : 0;
        const totalBudget = chantiersData.reduce((sum, c) => sum + (c.budget_actuel || 0), 0);
        const alertsCount = chantiersData.filter(c => c.health_score < 50 || c.priorite === 'critique').length;

        setKpis({
          totalChantiers,
          avgHealthScore,
          totalBudget,
          alertsCount
        });
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-amber-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const formatCurrency = (value: number): string => {
    const safeValue = value || 0;
    if (isNaN(safeValue)) return '0 €';
    return safeValue.toLocaleString('fr-FR') + ' €';
  };

  const formatBudgetMillions = (value: number): string => {
    const safeValue = value || 0;
    if (isNaN(safeValue)) return '0M€';
    return (safeValue / 1000000).toFixed(1) + 'M€';
  };

  const formatHealthScore = (value: number): string => {
    const safeValue = value || 0;
    if (isNaN(safeValue)) return '0%';
    return Math.round(safeValue) + '%';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Bienvenue, {profile?.prenom} {profile?.nom}
          </h1>
          <p className="text-slate-600 mt-2">Tableau de bord - Suivi Chantiers BE</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Chantiers actifs"
            value={(kpis.totalChantiers || 0).toString()}
            icon={<ChartBarIcon className="w-6 h-6" />}
            color="blue"
          />
          <KPICard
            title="Score santé moyen"
            value={formatHealthScore(kpis.avgHealthScore)}
            icon={<CheckCircleIcon className="w-6 h-6" />}
            color="green"
          />
          <KPICard
            title="Budget total"
            value={formatBudgetMillions(kpis.totalBudget)}
            icon={<CurrencyEuroIcon className="w-6 h-6" />}
            color="purple"
          />
          <KPICard
            title="Alertes"
            value={(kpis.alertsCount || 0).toString()}
            icon={<ExclamationTriangleIcon className="w-6 h-6" />}
            color="red"
          />
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">Chantiers en cours</h2>
          {chantiers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
              <ChartBarIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-600 mb-2">Aucun chantier actif</p>
              <p className="text-sm text-slate-500">Les chantiers en cours apparaîtront ici</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chantiers.map((chantier) => (
                <ChantierMiniCard key={chantier.id} chantier={chantier} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;