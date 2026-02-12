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
  const { setUser, setSession } = useAuthStore();

  useEffect(() => {
    // Safety timeout: if auth is not resolved within 3 seconds, force ready state
    const timeout = setTimeout(() => {
      const currentSession = useAuthStore.getState().session;
      if (currentSession === undefined) {
        console.warn('Auth timeout: forcing session to null after 3s');
        setSession(null);
      }
    }, 3000);

    // Get initial session - lightweight, no profile loading
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(timeout);
      
      if (error) {
        console.error('Auth session error:', error);
        setSession(null);
        return;
      }
      
      if (session) {
        setSession(session);
        // User will be set by AuthContext, don't duplicate here
      } else {
        setSession(null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('App.tsx auth event:', event);
      
      if (session) {
        setSession(session);
      } else {
        setSession(null);
        setUser(null);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [setSession, setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <Routes>
              {/* Routes publiques *}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              
              {/* Routes protégees *}
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="mes-chantiers" element={<MesChantiersPage />} />
                <Route path="tous-chantiers" element={
                  <ProtectedRoute requiredRole="directeur">
                    <TousChantiersPage />
                  </ProtectedRoute>
                } />
                <Route path="tableau-charge" element={<TableauChargePage />} />
                <Route path="facturation" element={<FacturationPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;