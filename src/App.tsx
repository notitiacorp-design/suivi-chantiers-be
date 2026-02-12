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
              },
            }}
          />
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="large" />
              </div>
            }
          >
            <Routes>
              {/* Routes publiques */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              
              {/* Routes protégées */}
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="dashboard-financier" element={
                  <ProtectedRoute requiredRole="directeur">
                    <DashboardFinancierPage />
                  </ProtectedRoute>
                } />
                <Route path="mes-chantiers" element={<MesChantiersPage />} />
                <Route path="tous-chantiers" element={
                  <ProtectedRoute requiredRole="directeur">
                    <TousChantiersPage />
                  </ProtectedRoute>
                } />
                <Route path="chantiers/:id" element={<ChantierDetailPage />} />
                <Route path="tableau-de-charge" element={
                  <ProtectedRoute requiredRole="directeur">
                    <TableauChargePage />
                  </ProtectedRoute>
                } />
                <Route path="facturation" element={<FacturationPage />} />
                <Route path="facturation-globale" element={
                  <ProtectedRoute requiredRole="directeur">
                    <FacturationGlobalePage />
                  </ProtectedRoute>
                } />
                <Route path="documents" element={
                  <ProtectedRoute requiredRole="directeur">
                    <DocumentsPage />
                  </ProtectedRoute>
                } />
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