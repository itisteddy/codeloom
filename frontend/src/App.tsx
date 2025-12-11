import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from './routes/RootLayout';
import { LoginPage } from './pages/LoginPage';
import { EncountersListPage } from './pages/EncountersListPage';
import { EncounterCreatePage } from './pages/EncounterCreatePage';
import { EncounterDetailRouterPage } from './pages/EncounterDetailRouterPage';
import { TrainingDashboardPage } from './pages/TrainingDashboardPage';
import { TrainingCasePage } from './pages/TrainingCasePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PilotSummaryPage } from './pages/PilotSummaryPage';
import { PilotOnboardingPage } from './pages/PilotOnboardingPage';
import { AdminLandingPage } from './pages/admin/AdminLandingPage';
import { BillingPage } from './pages/admin/BillingPage';
import { TeamPage } from './pages/admin/TeamPage';
import { SecurityPage } from './pages/admin/SecurityPage';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { isAdmin } from './types/roles';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/**
 * Route guard for admin-only pages (practice_admin and platform_admin)
 * Non-admin users are redirected to /encounters
 */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin(user.role)) {
    return <Navigate to="/encounters" replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/encounters" replace />} />
      <Route
        path="/encounters"
        element={
          <ProtectedRoute>
            <RootLayout>
              <EncountersListPage />
            </RootLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/encounters/new"
        element={
          <ProtectedRoute>
            <RootLayout>
              <EncounterCreatePage />
            </RootLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/encounters/:id"
        element={
          <ProtectedRoute>
            <RootLayout>
              <EncounterDetailRouterPage />
            </RootLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <RootLayout>
              <TrainingDashboardPage />
            </RootLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/cases/:id"
        element={
          <ProtectedRoute>
            <RootLayout>
              <TrainingCasePage />
            </RootLayout>
          </ProtectedRoute>
        }
      />
      {/* Admin-only routes */}
      <Route
        path="/analytics"
        element={
          <AdminRoute>
            <RootLayout>
              <AnalyticsPage />
            </RootLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <RootLayout>
              <AdminLandingPage />
            </RootLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/billing"
        element={
          <AdminRoute>
            <RootLayout>
              <BillingPage />
            </RootLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/team"
        element={
          <AdminRoute>
            <RootLayout>
              <TeamPage />
            </RootLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/security"
        element={
          <AdminRoute>
            <RootLayout>
              <SecurityPage />
            </RootLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/pilot/summary"
        element={
          <AdminRoute>
            <RootLayout>
              <PilotSummaryPage />
            </RootLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/pilot/onboarding"
        element={
          <AdminRoute>
            <RootLayout>
              <PilotOnboardingPage />
            </RootLayout>
          </AdminRoute>
        }
      />
      {/* Personal Settings - accessible to all users */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <RootLayout>
              <SettingsPage />
            </RootLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/encounters" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
