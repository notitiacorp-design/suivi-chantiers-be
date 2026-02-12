import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ChantiersListPageProps {
  filterMine?: boolean;
}

interface Chantier {
  id: string;
  nom: string;
  numero: string;
  client: string;
  phase: 'etude' | 'preparation' | 'execution' | 'reception' | 'garantie';
  statut: 'en_attente' | 'en_cours' | 'termine' | 'suspendu' | 'annule';
  health_score: number;
  avancement_physique: number;
  charge_affaires_id: string;
  date_debut: string;
  date_fin_prevue: string;
  priorite: string;
  ville: string;
}

const phaseLabels: Record<string, string> = {
  etude: 'Étude',
  preparation: 'Préparation',
  execution: 'Exécution',
  reception: 'Réception',
  garantie: 'Garantie'
};

const statutLabels: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  termine: 'Terminé',
  suspendu: 'Suspendu',
  annule: 'Annulé'
};

const ChantiersListPage: React.FC<ChantiersListPageProps> = ({ filterMine = false }) => {
  const { profile } = useAuth();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');

  useEffect(() => {
    fetchChantiers();
  }, [filterMine, profile]);

  const fetchChantiers = async () => {
    try {
      setLoading(true);
      let query = supabase.from('chantiers').select('*');

      if (filterMine && profile?.id) {
        query = query.eq('charge_affaires_id', profile.id);
      }

      const { data, error } = await query.order('date_debut', { ascending: false });

      if (error) throw error;
      setChantiers(data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des chantiers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChantiers = chantiers.filter(chantier => {
    const matchesSearch = chantier.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chantier.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chantier.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chantier.ville.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPhase = phaseFilter === 'all' || chantier.phase === phaseFilter;

    return matchesSearch && matchesPhase;
  });

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'en_cours':
        return 'bg-blue-100 text-blue-800';
      case 'termine':
        return 'bg-green-100 text-green-800';
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspendu':
        return 'bg-orange-100 text-orange-800';
      case 'annule':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {filterMine ? 'Mes Chantiers' : 'Tous les Chantiers'}
        </h1>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom, numéro, client, ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">Toutes les phases</option>
            <option value="etude">Étude</option>
            <option value="preparation">Préparation</option>
            <option value="execution">Exécution</option>
            <option value="reception">Réception</option>
            <option value="garantie">Garantie</option>
          </select>
        </div>
      </div>

      {filteredChantiers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-gray-500 text-lg">Aucun chantier trouvé</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numéro
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ville
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phase
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avancement
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Santé
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredChantiers.map((chantier) => (
                  <tr key={chantier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link to={`/chantiers/${chantier.id}`} className="text-blue-600 hover:text-blue-900">
                        {chantier.numero}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Link to={`/chantiers/${chantier.id}`} className="hover:text-blue-600">
                        {chantier.nom}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {chantier.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {chantier.ville}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {phaseLabels[chantier.phase]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatutColor(chantier.statut)}`}>
                        {statutLabels[chantier.statut]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${chantier.avancement_physique}%` }}
                          ></div>
                        </div>
                        <span>{chantier.avancement_physique}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${getHealthScoreColor(chantier.health_score)}`}>
                        {chantier.health_score}/100
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChantiersListPage;