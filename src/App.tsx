import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { supabase } from './lib/supabase';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import { AuthProvider } from './contexts/AuthContext';
import toast from 'react-hot-toast';

// Lazy loading des pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MesChantiersPage = lazy(() => import('./pages/MesChantiersPage'));
const TousChantiersPage = lazy(() => import('./pages/TousChantiersPage'));
const TableauChargePage = lazy(() => import('./pages/TableauChargePage'));
const FacturationPage = lazy(() => import('./pages/FacturationPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  const { user, setUser, setSession } = useAuthStore();

  useEffect(() => {
    // Safety timeout: if auth is not resolved within 5 seconds, force session to null
    const timeout = setTimeout(() => {
      const currentSession = useAuthStore.getState().session;
      if (currentSession === undefined) {
        console.warn('Auth timeout: forcing session to null after 5s');
        setSession(null);
      }
    }, 5000);

    // VÃÂ©rifier la session au chargement
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          loadUserProfile(session.user.id);
        }
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        setSession(null);
      });

    // ÃÂcouter les changements d'auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [setSession, setUser]);

  useEffect(() => {
    // VÃÂ©rifier les alertes ÃÂ  la connexion de l'utilisateur
    if (user?.id) {
      checkUserAlerts();
    }
  }, [user?.id]);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      toast.error('Erreur lors du chargement du profil');
    }
  };

  const checkUserAlerts = async () => {
    try {
      const { data: alerts, error } = await supabase
        .from('alertes')
        .select('*, chantiers(nom)')
        .eq('user_id', user?.id)
        .eq('resolue', false)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      if (alerts && alerts.length > 0) {
        alerts.forEach((alert: any) => {
          const severity = alert.severite === 'critique' ? 'Ã°ÂÂÂ´' : alert.severite === 'importante' ? 'Ã°ÂÂÂ ' : 'Ã°ÂÂÂ¡';
          toast(
            `${severity} ${alert.chantiers?.nom || 'Chantier'}: ${alert.message}`,
            {
              duration: 6000,
              icon: 'Ã¢ÂÂ Ã¯Â¸Â',
            }
          );
        });
      }
    } catch (error) {
      console.error('Erreur vÃÂ©rification alertes:', error);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <Routes>
            {/* Routes publiques */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Routes protÃÂ©gÃÂ©es */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="mes-chantiers" element={<MesChantiersPage />} />
              <Route path="tous-chantiers" element={<TousChantiersPage />} />
              <Route path="tableau-charge" element={<TableauChargePage />} />
              <Route path="facturation" element={<FacturationPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: '8px',
            },
          }}
        />
      </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
