import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import { AuthProvider } from './contexts/AuthContext';

// Lazy loading des pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DashboardFinancierPage = lazy(() => import('./pages/DashboardFinancierPage'));
const MesChantiersPage = lazy(() => import('./pages/MesChantiersPage'));
const TousChantiersPage = lazy(() => import('./pages/TousChantiersPage'));
const ChantierDetailPage = lazy(() => import('./pages/ChantierDetailPage'));
const TableauChargePage = lazy(() => import('./pages/TableauChargePage'));
const FacturationPage = lazy(() => import('./pages/FacturationPage'));
const FacturationGlobalePage = lazy(() => import('./pages/FacturationGlobalePage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const EtudesTechniquesPage = lazy(() => import('./pages/EtudesTechniquesPage'));
const RapportsHebdoPage = lazy(() => import('./pages/RapportsHebdoPage'));
const JournalChantierPage = lazy(() => import('./pages/JournalChantierPage'));
const PipelineCommercialPage = lazy(() => import('./pages/PipelineCommercialPage'));
const AchatsPage = lazy(() => import('./pages/AchatsPage'));

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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
                borderRadius: '8px',
              },
            }}
          />
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
                <LoadingSpinner />
              </div>
            }
          >
            <Routes>
              {/* Routes publiques */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Routes prot\u00e9g\u00e9es */}
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
                <Route path="dashboard-financier" element={<DashboardFinancierPage />} />
                <Route path="mes-chantiers" element={<MesChantiersPage />} />
                <Route path="tous-chantiers" element={<TousChantiersPage />} />
                <Route path="chantier/:id" element={<ChantierDetailPage />} />
                <Route path="tableau-charge" element={<TableauChargePage />} />
                <Route path="facturation" element={<FacturationPage />} />
                <Route path="facturation-globale" element={<FacturationGlobalePage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="etudes-techniques" element={<EtudesTechniquesPage />} />
                  <Route path="rapports-hebdo" element={<RapportsHebdoPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                <Route path="journal-chantier" element={<JournalChantierPage />} />
                <Route path="pipeline" element={<PipelineCommercialPage />} />
                <Route path="achats" element={<AchatsPage />} />
              </Route>

              {/* Redirection par d\u00e9faut */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
