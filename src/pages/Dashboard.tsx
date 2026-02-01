import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMerchantBalance, useDashboardStats, useMerchantPayments } from '@/hooks/useMerchantData';
import { formatCurrency, formatUSDT, formatRelativeTime } from '@/lib/i18n';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { Wallet, TrendingUp, Clock, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  confirmed: { label: 'Confirmado', class: 'badge-confirmed' },
  pending: { label: 'Pendiente', class: 'badge-pending' },
  failed: { label: 'Fallido', class: 'badge-failed' },
  expired: { label: 'Expirado', class: 'badge-failed' },
  created: { label: 'Creado', class: 'badge-pending' },
};

export const Dashboard: React.FC = () => {
  const { t, locale, currency } = useApp();
  const { merchant } = useAuth();
  
  const { data: balance, isLoading: balanceLoading } = useMerchantBalance();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentPayments, isLoading: paymentsLoading } = useMerchantPayments({ limit: 5 });

  const businessName = merchant?.business_name || 'Mi Negocio';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('welcomeBack')}, <span className="text-gradient">{businessName}</span>
        </h1>
        <p className="text-muted-foreground">
          Resumen de tu actividad en DeltaPay
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t('totalBalance')}
          value={balanceLoading ? '...' : formatUSDT(balance?.balance_available || 0)}
          icon={Wallet}
          trend="up"
        />
        <MetricCard
          title={t('todaySales')}
          value={statsLoading ? '...' : formatUSDT(stats?.todaySales || 0)}
          change={stats?.totalTransactionsToday ? { 
            value: stats.totalTransactionsToday, 
            label: 'transacciones' 
          } : undefined}
          icon={TrendingUp}
          trend="up"
        />
        <MetricCard
          title={t('pendingPayouts')}
          value={statsLoading ? '...' : formatUSDT(stats?.pendingPayouts || 0)}
          icon={Clock}
          trend="neutral"
        />
        <MetricCard
          title="Ventas (30d)"
          value={statsLoading ? '...' : formatUSDT(stats?.monthSales || 0)}
          icon={BarChart3}
          trend="up"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart data={stats?.dailySalesChart} isLoading={statsLoading} />
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="mb-4 text-lg font-semibold">Balance USDT</h3>
          <div className="space-y-4">
            <div className="text-center py-6">
              {balanceLoading ? (
                <Skeleton className="h-12 w-32 mx-auto" />
              ) : (
                <>
                  <p className="stat-value text-gradient text-4xl">
                    {formatUSDT(balance?.balance_available || 0)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Disponible para retiro
                  </p>
                </>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pendiente</span>
                <span className="font-mono">
                  {balanceLoading ? '...' : formatUSDT(balance?.balance_pending || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono">
                  {balanceLoading ? '...' : formatUSDT(balance?.balance_total || 0)}
                </span>
              </div>
            </div>
            <button className="btn-primary-glow mt-4 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90">
              Solicitar Retiro
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass rounded-xl">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <h3 className="text-lg font-semibold">{t('recentTransactions')}</h3>
          <a href="/payments" className="text-sm text-primary hover:text-primary/80 transition-colors">
            {t('viewAll')} →
          </a>
        </div>
        <div className="divide-y divide-border/50">
          {paymentsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))
          ) : recentPayments?.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground">
              No hay transacciones recientes
            </div>
          ) : (
            recentPayments?.map((tx) => {
              const status = statusConfig[tx.status as keyof typeof statusConfig] || statusConfig.pending;
              const isPayment = true;

              return (
                <div
                  key={tx.id}
                  className="table-row flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full',
                        tx.status === 'confirmed'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      )}
                    >
                      {tx.status === 'confirmed' ? (
                        <ArrowDownRight className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {tx.customer_name || (tx.products as any)?.name || 'Pago'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeTime(new Date(tx.created_at), locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn('badge-status', status.class)}>
                      {status.label}
                    </span>
                    <p
                      className={cn(
                        'font-mono font-medium text-right min-w-[120px]',
                        tx.status === 'confirmed' ? 'text-success' : 'text-foreground'
                      )}
                    >
                      {tx.status === 'confirmed' && tx.amount_usdt_net
                        ? formatUSDT(tx.amount_usdt_net)
                        : formatCurrency(tx.amount_local, tx.currency as 'ARS' | 'BRL' | 'USD', locale)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
