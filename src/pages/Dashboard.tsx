import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatUSDT } from '@/lib/i18n';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { Wallet, TrendingUp, Clock, BarChart3 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t, locale, currency } = useApp();

  // Mock data - in real app this would come from API
  const mockBalance = currency === 'ARS' ? 15420000 : currency === 'BRL' ? 89500 : 12450;
  const mockTodaySales = currency === 'ARS' ? 2340000 : currency === 'BRL' ? 13500 : 1890;
  const mockPending = 2450.75;
  const mockConversionRate = 98.5;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('welcomeBack')}, <span className="text-gradient">Mi Negocio</span>
        </h1>
        <p className="text-muted-foreground">
          Resumen de tu actividad en DeltaPay
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t('totalBalance')}
          value={formatUSDT(mockPending * 5)}
          change={{ value: 12.5, label: 'vs mes anterior' }}
          icon={Wallet}
          trend="up"
        />
        <MetricCard
          title={t('todaySales')}
          value={formatCurrency(mockTodaySales, currency, locale)}
          change={{ value: 8.2, label: 'vs ayer' }}
          icon={TrendingUp}
          trend="up"
        />
        <MetricCard
          title={t('pendingPayouts')}
          value={formatUSDT(mockPending)}
          icon={Clock}
          trend="neutral"
        />
        <MetricCard
          title={t('conversionRate')}
          value={`${mockConversionRate}%`}
          change={{ value: 2.1, label: 'vs semana anterior' }}
          icon={BarChart3}
          trend="up"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="mb-4 text-lg font-semibold">Balance USDT</h3>
          <div className="space-y-4">
            <div className="text-center py-6">
              <p className="stat-value text-gradient text-4xl">
                {formatUSDT(12254.38)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Disponible para retiro
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pendiente</span>
                <span className="font-mono">{formatUSDT(2450.75)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">En proceso</span>
                <span className="font-mono">{formatUSDT(500.00)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total acumulado</span>
                <span className="font-mono">{formatUSDT(45320.50)}</span>
              </div>
            </div>
            <button className="btn-primary-glow mt-4 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90">
              Solicitar Retiro
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <RecentTransactions />
    </div>
  );
};

export default Dashboard;
