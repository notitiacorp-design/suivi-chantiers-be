import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'directeur' | 'charge_affaires';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, profile, loading } = useAuth();

  // Si on est encore en train de charger
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Pas de session = rediriger vers login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // V\u00e9rifier le role si requis
  if (requiredRole && profile?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acc\u00e8s refus\u00e9</h2>
          <p className="text-gray-600">Vous n'avez pas les permissions n\u00e9cessaires pour acc\u00e9der \u00e0 cette page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
