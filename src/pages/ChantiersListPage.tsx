import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MagnifyingGlassIcon, FunnelIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
  const [showCreate, setShowCreate] = useState(false);
  const [newChantier, setNewChantier] = useState({
    nom: '',
    numero: '',
    client: '',
    adresse: '',
    ville: '',
    code_postal: '',
    charge_affaires_id: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin_prevue: '',
    budget_initial: 0,
    phase: 'etude',
  });

  const { data: chargesAffaires = [] } = useQuery({
    queryKey: ['charges-affaires-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nom, prenom')
        .eq('role', 'charge_affaires')
        .order('nom');
      if (error) throw error;
      return data || [];
    },
  });

  const createChantierMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...newChantier,
        budget_actuel: Number(newChantier.budget_initial) || 0,
        depenses_actuelles: 0,
        avancement_physique: 0,
        health_score: 100,
        actif: true,
        statut: 'en_attente',
      };
      const { error } = await supabase.from('chantiers').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Chantier créé');
      setShowCreate(false);
      setNewChantier({
        nom: '', numero: '', client: '', adresse: '', ville: '', code_postal: '', charge_affaires_id: '',
        date_debut: new Date().toISOString().split('T')[0], date_fin_prevue: '', budget_initial: 0, phase: 'etude',
      });
      fetchChantiers();
    },
    onError: (error: any) => toast.error(error.message || 'Erreur création chantier'),
  });

  useEffect(() => {
    fetchChantiers();
  }, [filterMine, profile]);

  const fetchChantiers = async () => {
    try {
      setLoading(true);
      let query = supabase.from('chantiers').select('*');

      const isDirecteur = profile?.role === 'directeur' || profile?.role === 'admin';
      if (filterMine && profile?.id && !isDirecteur) {
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-900">
          {filterMine ? 'Mes Chantiers' : 'Tous les Chantiers'}
        </h1>
        {!filterMine && (
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <PlusIcon className="w-5 h-5" /> Nouveau chantier
          </button>
        )}
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
          <p className="text-gray-500 text-lg">{filterMine ? 'Aucun chantier assigné à votre profil' : 'Aucun chantier trouvé'}</p>
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
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold">Nouveau chantier</h2><button onClick={() => setShowCreate(false)}><XMarkIcon className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded p-2" placeholder="Numéro" value={newChantier.numero} onChange={(e)=>setNewChantier({...newChantier, numero:e.target.value})}/>
              <input className="border rounded p-2" placeholder="Nom" value={newChantier.nom} onChange={(e)=>setNewChantier({...newChantier, nom:e.target.value})}/>
              <input className="border rounded p-2" placeholder="Client" value={newChantier.client} onChange={(e)=>setNewChantier({...newChantier, client:e.target.value})}/>
              <input className="border rounded p-2" placeholder="Ville" value={newChantier.ville} onChange={(e)=>setNewChantier({...newChantier, ville:e.target.value})}/>
              <input className="border rounded p-2" placeholder="Code postal" value={newChantier.code_postal} onChange={(e)=>setNewChantier({...newChantier, code_postal:e.target.value})}/>
              <input className="border rounded p-2" type="number" placeholder="Budget initial" value={newChantier.budget_initial} onChange={(e)=>setNewChantier({...newChantier, budget_initial:Number(e.target.value)})}/>
              <input className="border rounded p-2 md:col-span-2" placeholder="Adresse" value={newChantier.adresse} onChange={(e)=>setNewChantier({...newChantier, adresse:e.target.value})}/>
              <input className="border rounded p-2" type="date" lang="fr-FR" placeholder="jj/mm/aaaa" value={newChantier.date_debut} onChange={(e)=>setNewChantier({...newChantier, date_debut:e.target.value})}/>
              <input className="border rounded p-2" type="date" lang="fr-FR" placeholder="jj/mm/aaaa" value={newChantier.date_fin_prevue} onChange={(e)=>setNewChantier({...newChantier, date_fin_prevue:e.target.value})}/>
              <select className="border rounded p-2" value={newChantier.phase} onChange={(e)=>setNewChantier({...newChantier, phase:e.target.value})}>
                <option value="etude">Étude</option><option value="preparation">Préparation</option><option value="execution">Exécution</option><option value="reception">Réception</option><option value="garantie">Garantie</option>
              </select>
              <select className="border rounded p-2" value={newChantier.charge_affaires_id} onChange={(e)=>setNewChantier({...newChantier, charge_affaires_id:e.target.value})}>
                <option value="">Chargé d'affaires</option>
                {chargesAffaires.map((ca: any)=><option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>)}
              </select>
            </div>
            <div className="mt-4 flex justify-end">
              <button disabled={createChantierMutation.isPending || !newChantier.nom || !newChantier.numero || !newChantier.client || !newChantier.charge_affaires_id || !newChantier.date_fin_prevue} onClick={()=>createChantierMutation.mutate()} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChantiersListPage;
