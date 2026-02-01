import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useMerchantBalance = () => {
  const { merchant } = useAuth();

  return useQuery({
    queryKey: ['merchant-balance', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) throw new Error('No merchant');
      
      const { data, error } = await supabase.rpc('get_merchant_balance', {
        _merchant_id: merchant.id,
      });

      if (error) throw error;
      return data?.[0] || { balance_available: 0, balance_pending: 0, balance_total: 0 };
    },
    enabled: !!merchant?.id,
    staleTime: 30000,
  });
};

export const useMerchantPayments = (filters?: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) => {
  const { merchant } = useAuth();

  return useQuery({
    queryKey: ['merchant-payments', merchant?.id, filters],
    queryFn: async () => {
      if (!merchant?.id) throw new Error('No merchant');

      let query = supabase
        .from('payments')
        .select(`
          *,
          products:product_id (name)
        `)
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status as 'created' | 'pending' | 'confirmed' | 'expired' | 'failed');
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!merchant?.id,
    staleTime: 15000,
  });
};

export const useMerchantProducts = () => {
  const { merchant } = useAuth();

  return useQuery({
    queryKey: ['merchant-products', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) throw new Error('No merchant');

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!merchant?.id,
  });
};

export const useMerchantPayouts = () => {
  const { merchant } = useAuth();

  return useQuery({
    queryKey: ['merchant-payouts', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) throw new Error('No merchant');

      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!merchant?.id,
  });
};

export const useMerchantLedger = (limit: number = 50) => {
  const { merchant } = useAuth();

  return useQuery({
    queryKey: ['merchant-ledger', merchant?.id, limit],
    queryFn: async () => {
      if (!merchant?.id) throw new Error('No merchant');

      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!merchant?.id,
  });
};

export const useDashboardStats = () => {
  const { merchant } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) throw new Error('No merchant');

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Today's sales
      const { data: todaySales } = await supabase
        .from('payments')
        .select('amount_usdt_net')
        .eq('merchant_id', merchant.id)
        .eq('status', 'confirmed')
        .gte('confirmed_at', todayStart);

      // Week sales
      const { data: weekSales } = await supabase
        .from('payments')
        .select('amount_usdt_net, confirmed_at')
        .eq('merchant_id', merchant.id)
        .eq('status', 'confirmed')
        .gte('confirmed_at', weekAgo);

      // Month sales
      const { data: monthSales } = await supabase
        .from('payments')
        .select('amount_usdt_net')
        .eq('merchant_id', merchant.id)
        .eq('status', 'confirmed')
        .gte('confirmed_at', monthAgo);

      // Pending payouts
      const { data: pendingPayouts } = await supabase
        .from('payouts')
        .select('amount_usdt')
        .eq('merchant_id', merchant.id)
        .in('status', ['requested', 'approved']);

      const todayTotal = todaySales?.reduce((sum, p) => sum + (p.amount_usdt_net || 0), 0) || 0;
      const weekTotal = weekSales?.reduce((sum, p) => sum + (p.amount_usdt_net || 0), 0) || 0;
      const monthTotal = monthSales?.reduce((sum, p) => sum + (p.amount_usdt_net || 0), 0) || 0;
      const pendingTotal = pendingPayouts?.reduce((sum, p) => sum + (p.amount_usdt || 0), 0) || 0;

      // Group week sales by day for chart
      const dailySales: Record<string, number> = {};
      weekSales?.forEach((p) => {
        if (p.confirmed_at) {
          const day = new Date(p.confirmed_at).toLocaleDateString('es-AR', { weekday: 'short' });
          dailySales[day] = (dailySales[day] || 0) + (p.amount_usdt_net || 0);
        }
      });

      return {
        todaySales: todayTotal,
        weekSales: weekTotal,
        monthSales: monthTotal,
        pendingPayouts: pendingTotal,
        dailySalesChart: dailySales,
        totalTransactionsToday: todaySales?.length || 0,
      };
    },
    enabled: !!merchant?.id,
    staleTime: 60000,
  });
};
