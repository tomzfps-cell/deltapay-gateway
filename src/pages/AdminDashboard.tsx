import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatUSDT } from '@/lib/i18n';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Users, TrendingUp, Wallet, Clock, Package, CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: merchantCount },
        { data: todayPayments },
        { data: monthPayments },
        { data: pendingPayouts },
        { count: orderCount },
      ] = await Promise.all([
        supabase.from('merchants').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('amount_usdt_net').eq('status', 'confirmed').gte('confirmed_at', todayStart),
        supabase.from('payments').select('amount_usdt_net').eq('status', 'confirmed').gte('confirmed_at', monthAgo),
        supabase.from('payouts').select('amount_usdt').in('status', ['requested', 'approved', 'sent']),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
      ]);

      return {
        totalMerchants: merchantCount || 0,
        todaySales: todayPayments?.reduce((s, p) => s + (p.amount_usdt_net || 0), 0) || 0,
        monthSales: monthPayments?.reduce((s, p) => s + (p.amount_usdt_net || 0), 0) || 0,
        pendingPayouts: pendingPayouts?.reduce((s, p) => s + (p.amount_usdt || 0), 0) || 0,
        totalOrders: orderCount || 0,
        todayTransactions: todayPayments?.length || 0,
      };
    },
    staleTime: 30000,
  });
};

const useAdminMerchants = () => {
  return useQuery({
    queryKey: ['admin-merchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, business_name, email, country, is_active, is_verified, created_at, fee_percentage')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
};

export const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: merchants, isLoading: merchantsLoading } = useAdminMerchants();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Panel de <span className="text-gradient">Administración</span>
        </h1>
        <p className="text-muted-foreground">Resumen global de DeltaPay</p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Merchants"
          value={statsLoading ? '...' : String(stats?.totalMerchants || 0)}
          icon={Users}
          trend="up"
        />
        <MetricCard
          title="Ventas hoy"
          value={statsLoading ? '...' : formatUSDT(stats?.todaySales || 0)}
          change={stats?.todayTransactions ? { value: stats.todayTransactions, label: 'transacciones' } : undefined}
          icon={TrendingUp}
          trend="up"
        />
        <MetricCard
          title="Ventas (30d)"
          value={statsLoading ? '...' : formatUSDT(stats?.monthSales || 0)}
          icon={CreditCard}
          trend="up"
        />
        <MetricCard
          title="Payouts pendientes"
          value={statsLoading ? '...' : formatUSDT(stats?.pendingPayouts || 0)}
          icon={Clock}
          trend="neutral"
        />
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link to="/admin/orders">
          <Button variant="outline" className="gap-2">
            <Package className="h-4 w-4" /> Ver pedidos
          </Button>
        </Link>
      </div>

      {/* Merchants table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="text-lg font-semibold">Merchants</h3>
        </div>
        {merchantsLoading ? (
          <div className="p-6 space-y-3">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Negocio</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">País</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Registro</th>
                </tr>
              </thead>
              <tbody>
                {merchants?.map((m) => (
                  <tr key={m.id} className="table-row">
                    <td className="px-4 py-3 font-medium">{m.business_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3">{m.country}</td>
                    <td className="px-4 py-3 font-mono">{(m.fee_percentage * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        m.is_active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200'
                      }`}>
                        {m.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
