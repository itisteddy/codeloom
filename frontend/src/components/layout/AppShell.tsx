import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { IS_DEV, IS_PILOT, APP_VERSION } from '../../version';

interface AppShellProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  to: string;
  roles?: Array<'provider' | 'biller' | 'admin'>;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = useMemo(
    () => [
      { label: 'Encounters', to: '/encounters' },
      { label: 'Training', to: '/training' },
      { label: 'Analytics', to: '/analytics', roles: ['biller', 'admin'] },
      { label: 'Billing', to: '/admin/billing', roles: ['admin'] },
      { label: 'Team', to: '/admin/team', roles: ['admin'] },
      { label: 'Security & Data', to: '/admin/security', roles: ['admin'] },
      { label: 'Settings', to: '/settings/practice', roles: ['biller', 'admin'] },
      { label: 'Pilot Summary', to: '/admin/pilot/summary', roles: ['admin'] },
      { label: 'Onboarding', to: '/admin/pilot/onboarding', roles: ['admin'] },
    ],
    []
  );

  // Show a user-friendly practice name (in a real app, this would come from the practice record)
  const practiceLabel = 'Sample Family Practice';
  const roleLabel = user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : 'User';

  const renderNav = (item: NavItem) => {
    if (item.roles && user && !item.roles.includes(user.role)) return null;
    const active = location.pathname.startsWith(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
          active
            ? 'bg-slate-100 text-brand-ink font-medium'
            : 'text-semantic-muted hover:bg-slate-100'
        )}
        onClick={() => setSidebarOpen(false)}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white shadow-sm transition-transform lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="flex h-16 items-center gap-2 px-4 border-b border-semantic-border">
            <Link to="/encounters" className="flex items-center gap-2">
              <img src="/logo.png" alt="Codeloom" className="h-6 w-6" />
              <span className="text-lg font-medium text-brand-ink">Codeloom</span>
            </Link>
          </div>
          <div className="px-3 py-4 space-y-1">{navItems.map(renderNav)}</div>
          {IS_DEV && (
            <div className="px-4 py-4 mt-auto text-xs text-semantic-muted">
              v{APP_VERSION}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-semantic-border">
            <div className="flex items-center justify-between px-4 py-3 lg:px-6">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-lg border border-semantic-border bg-white px-3 py-2 text-sm font-medium text-semantic-muted shadow-sm hover:bg-slate-50 transition-colors duration-150 lg:hidden"
                  onClick={() => setSidebarOpen((v) => !v)}
                >
                  Menu
                </button>
                <div className="hidden lg:flex items-center gap-2">
                  <span className="text-sm font-medium text-brand-ink">{practiceLabel}</span>
                  {IS_PILOT && (
                    <Badge variant="info" className="text-xs">
                      Pilot
                    </Badge>
                  )}
                  {IS_DEV && (
                    <Badge variant="outline" className="text-xs">
                      Dev
                    </Badge>
                  )}
                </div>
              </div>
              {user && (
                <div className="flex items-center gap-3">
                  <Badge variant="default">{roleLabel}</Badge>
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-sm font-medium text-brand-ink">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-xs text-semantic-muted">{user.email}</span>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-tealSoft text-brand-teal font-semibold text-sm">
                    {user.firstName.charAt(0)}
                    {user.lastName.charAt(0)}
                  </div>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    Log out
                  </Button>
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

