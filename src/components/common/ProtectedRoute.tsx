import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'directeur' | 'charge_affaires';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, session, initialized } = useAuthStore();

  // Attendre que l'ÃÂ©tat d'auth soit dÃÂ©terminÃÂ©
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

  // VÃÂ©rifier le rÃÂ´le si requis
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">AccÃÂ¨s refusÃÂ©</h2>
          <p className="text-slate-600">
            Vous n'avez pas les permissions nÃÂ©cessaires pour accÃÂ©der ÃÂ  cette page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
