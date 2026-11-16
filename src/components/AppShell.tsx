import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Bird,
  CalendarDays,
  Egg,
  GitCompare,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useData } from '@/src/context/DataContext';
import { SyncStatusPill } from './SyncStatusPill';

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ title, subtitle, actions, children }) => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut, guestPendingMigrationCount, migrateGuestPlans, dismissGuestMigration } =
    useAuth();
  const { pendingCount, conflicts, handleResolveConflict, siteSettings } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/planner/broiler', label: 'Broiler Planner', icon: Bird },
    { to: '/planner/layer', label: 'Layer Planner', icon: Egg },
    { to: '/scenarios', label: 'What-If Scenarios', icon: GitCompare },
    { to: '/calendar', label: 'Production Calendar', icon: CalendarDays },
    { to: '/reports', label: 'Reports & Export', icon: BarChart3 },
    { to: '/settings', label: 'Farms & Settings', icon: Settings },
  ];

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      await migrateGuestPlans();
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F0] text-[#26312D] flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden no-print"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#173F35] text-white flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 no-print ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="overflow-y-auto">
          <div className="px-5 h-16 flex items-center justify-between border-b border-white/10">
            <Link
              to="/"
              className="text-base font-extrabold font-display tracking-tight text-white whitespace-nowrap truncate"
            >
              {siteSettings.site_name || 'Poultry Profit Planner'}
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Public Homepage</span>
            </Link>

            <div className="pt-2 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Farm Workspace
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#4F8A5B] text-white font-semibold'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}

            <div className="pt-2 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Administration
            </div>
            <NavLink
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#E6B84A] text-[#173F35] font-semibold'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {isAdmin ? 'Admin CMS' : 'Admin CMS'}
              </span>
            </NavLink>
          </nav>
        </div>

        {/* Account Footer in Sidebar */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-white truncate">
              {user ? profile?.full_name || user.email : 'Guest Mode (Device Only)'}
            </p>
            <p className="text-white/65 truncate">
              {user ? (isAdmin ? 'Administrator' : 'Farm Account') : 'Sign in to sync across devices'}
            </p>
          </div>
          {user ? (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/auth"
              className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#E6B84A] text-[#173F35] text-xs font-bold hover:bg-[#E6B84A]/90 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Sync</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#26312D]/10 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[#173F35] hover:bg-[#F7F6F0]"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#173F35] font-display truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden sm:block text-xs text-[#26312D]/65 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <SyncStatusPill />
            {actions}
          </div>
        </header>

        {/* Advisories: Pending Offline Data & Guest Migration & Sync Conflicts */}
        <div className="px-4 sm:px-6 lg:px-8 space-y-3 pt-4 no-print empty:hidden">
          {pendingCount > 0 && (
            <div className="rounded-xl border border-[#E6B84A] bg-[#E6B84A]/15 px-4 py-3 text-xs sm:text-sm text-[#26312D] flex items-center justify-between gap-3">
              <span>
                <strong>{pendingCount} offline record{pendingCount === 1 ? '' : 's'}</strong> saved on this device. Avoid clearing browser site data until synced.
              </span>
            </div>
          )}

          {user && guestPendingMigrationCount > 0 && (
            <div className="rounded-xl border border-[#4F8A5B] bg-[#4F8A5B]/10 px-4 py-3 text-sm text-[#173F35] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>
                Found <strong>{guestPendingMigrationCount}</strong> local plan/farm item{guestPendingMigrationCount === 1 ? '' : 's'} saved on this device before sign-in. Migrate them into your cloud account?
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={migrating}
                  onClick={() => void handleMigrate()}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#173F35] text-white text-xs font-semibold hover:bg-[#173F35]/90"
                >
                  {migrating ? 'Migrating...' : 'Migrate to Account'}
                </button>
                <button
                  type="button"
                  onClick={dismissGuestMigration}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#26312D]/20 bg-white text-xs font-medium text-[#26312D]"
                >
                  Later
                </button>
              </div>
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
                <AlertTriangle className="w-4 h-4" />
                <span>Sync Conflict Detected ({conflicts.length})</span>
              </div>
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-red-200 text-xs text-red-900"
                >
                  <span>
                    Record in <strong>{c.table}</strong> was updated on another device while offline. Choose which version to keep:
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleResolveConflict(c.id, 'keep_local')}
                      className="min-h-[36px] px-3 py-1 rounded-md bg-red-800 text-white font-semibold"
                    >
                      Keep This Device
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResolveConflict(c.id, 'accept_server')}
                      className="min-h-[36px] px-3 py-1 rounded-md border border-red-300 bg-white text-red-900 font-semibold"
                    >
                      Use Server Version
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Viewport Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
