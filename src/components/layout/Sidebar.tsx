import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import {
  LayoutDashboard,
  CreditCard,
  Package,
  Wallet,
  Webhook,
  Key,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { key: 'dashboard', path: '/', icon: LayoutDashboard },
  { key: 'payments', path: '/payments', icon: CreditCard },
  { key: 'products', path: '/products', icon: Package },
  { key: 'withdrawals', path: '/withdrawals', icon: Wallet },
  { key: 'webhooks', path: '/webhooks', icon: Webhook },
  { key: 'apiKeys', path: '/api-keys', icon: Key },
  { key: 'settings', path: '/settings', icon: Settings },
] as const;

export const Sidebar: React.FC = () => {
  const { t, sidebarOpen, setSidebarOpen } = useApp();
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full border-r border-sidebar-border bg-sidebar transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20',
          'lg:relative'
        )}
      >
        <div className={cn('flex h-full flex-col', !sidebarOpen && 'lg:items-center')}>
          {/* Logo */}
          <div className={cn(
            'flex h-16 items-center border-b border-sidebar-border px-4',
            !sidebarOpen && 'lg:justify-center lg:px-0'
          )}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <span className="text-lg font-bold text-primary-foreground">Δ</span>
              </div>
              {sidebarOpen && (
                <span className="text-xl font-bold text-foreground">DeltaPay</span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <NavLink
                  key={item.key}
                  to={item.path}
                  className={cn(
                    'nav-item',
                    isActive && 'nav-item-active',
                    !sidebarOpen && 'lg:justify-center lg:px-0'
                  )}
                  onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {sidebarOpen && (
                    <span className="truncate">{t(item.key as any)}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Toggle button - desktop only */}
          <div className="hidden border-t border-sidebar-border p-3 lg:block">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                'nav-item w-full',
                !sidebarOpen && 'justify-center px-0'
              )}
            >
              {sidebarOpen ? (
                <>
                  <ChevronLeft className="h-5 w-5" />
                  <span>Colapsar</span>
                </>
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
