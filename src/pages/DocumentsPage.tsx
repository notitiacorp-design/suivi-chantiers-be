import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { FileText, Search, Filter, Upload, Download } from 'lucide-react';

const DocumentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('tous');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['all-documents', filterType],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*, chantiers(nom)')
        .order('created_at', { ascending: false });
      
      if (filterType !== 'tous') {
        query = query.eq('type', filterType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const filteredDocs = documents.filter((doc: any) =>
    doc.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.chantiers?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un document..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-300 rounded-lg px-4 py-2"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="tous">Tous les types</option>
          <option value="plan_reservation">Plans de réservation</option>
          <option value="plan_implantation">Plans d\'implantation</option>
          <option value="pv_reception">PV de réception</option>
          <option value="doe">DOE</option>
          <option value="dgd">DGD</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement des documents...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="mt-4 text-gray-500">Aucun document trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chantier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDocs.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.nom}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{doc.chantiers?.nom || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{doc.type?.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4 text-sm">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      <Download className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
