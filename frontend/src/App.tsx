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
import { PlanUsagePage } from './pages/PlanUsagePage';
import { PracticeSettingsPage } from './pages/PracticeSettingsPage';
import { PilotSummaryPage } from './pages/PilotSummaryPage';
import { PilotOnboardingPage } from './pages/PilotOnboardingPage';
import { PracticeNpsPrompt } from './components/PracticeNpsPrompt';
import { AuthProvider, useAuth } from './auth/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
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
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <RootLayout>
              <AnalyticsPage />
            </RootLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/plan"
        element={
          <ProtectedRoute>
            <RootLayout>
              <PlanUsagePage />
            </RootLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/practice"
        element={
          <ProtectedRoute>
            <RootLayout>
              <PracticeSettingsPage />
            </RootLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pilot/summary"
        element={
          <ProtectedRoute>
            <RootLayout>
              <PilotSummaryPage />
            </RootLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pilot/onboarding"
        element={
          <ProtectedRoute>
            <RootLayout>
              <PilotOnboardingPage />
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
