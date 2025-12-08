import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface Props {
  children: React.ReactNode;
}

export const RootLayout: React.FC<Props> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b px-4 py-3 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/encounters" className="text-xl font-semibold hover:text-slate-700">
              Codeloom
            </Link>
            <nav className="flex gap-4">
              <Link
                to="/encounters"
                className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1"
              >
                Encounters
              </Link>
              <Link
                to="/training"
                className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1"
              >
                Training
              </Link>
              {(user?.role === 'biller' || user?.role === 'admin') && (
                <>
                  <Link
                    to="/analytics"
                    className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1"
                  >
                    Analytics
                  </Link>
                  <Link
                    to="/settings/plan"
                    className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1"
                  >
                    Plan & Usage
                  </Link>
                  <Link
                    to="/settings/practice"
                    className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1"
                  >
                    Settings
                  </Link>
                </>
              )}
              {user?.role === 'admin' && (
                <>
                  <Link
                    to="/admin/pilot/summary"
                    className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1"
                  >
                    Pilot Summary
                  </Link>
                  <Link
                    to="/admin/pilot/onboarding"
                    className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1"
                  >
                    Onboarding
                  </Link>
                </>
              )}
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-700">
                {user.firstName} {user.lastName} ({user.role})
              </span>
              <button
                onClick={logout}
                className="text-sm px-3 py-1 border rounded hover:bg-slate-100"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
      <footer className="border-t px-4 py-2 text-xs text-slate-500">
        Codeloom v{import.meta.env.VITE_APP_VERSION || 'dev'} – MVP scaffold
      </footer>
    </div>
  );
};
