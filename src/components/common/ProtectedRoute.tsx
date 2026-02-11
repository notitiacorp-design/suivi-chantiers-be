import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'chef_atelier' | 'directeur';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, session, initialized } = useAuthStore();

  // Attendre que l'Ã©tat d'auth soit dÃ©terminÃ©
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Pas de session = rediriger vers login
  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  // VÃ©rifier le rÃ´le si requis
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">AccÃ¨s refusÃ©</h2>
          <p className="text-slate-600">
            Vous n'avez pas les permissions nÃ©cessaires pour accÃ©der Ã  cette page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
