import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

export const DashboardLayout: React.FC = () => {
  const { sidebarOpen } = useApp();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
        )}
      >
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
