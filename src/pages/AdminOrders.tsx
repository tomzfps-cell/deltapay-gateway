import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/i18n';
import { Search, Package, Loader2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface OrderRow {
  id: string;
  status: string;
  total_amount: number;
  product_snapshot_name: string;
  product_snapshot_currency: string;
  customer_email: string;
  shipping_name: string;
  shipping_lastname: string;
  created_at: string;
  payment_id?: string;
  payment_status?: string;
}

const PAGE_SIZE = 20;

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending_payment: 'bg-amber-100 text-amber-700 border-amber-200',
    created: 'bg-gray-100 text-gray-600 border-gray-200',
    expired: 'bg-red-100 text-red-600 border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
};

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadOrders = async (searchTerm: string, pageNum: number) => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('id, status, total_amount, product_snapshot_name, product_snapshot_currency, customer_email, shipping_name, shipping_lastname, created_at')
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (searchTerm.trim()) {
        // Search by order ID prefix or email
        query = query.or(`id.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch payments for these orders
      const orderIds = (data || []).map(o => o.id);
      let payments: any[] = [];
      if (orderIds.length > 0) {
        const { data: payData } = await supabase
          .from('payments')
          .select('id, order_id, status')
          .in('order_id', orderIds);
        payments = payData || [];
      }

      const enriched: OrderRow[] = (data || []).map(o => {
        const p = payments.find(pay => pay.order_id === o.id);
        return {
          ...o,
          payment_id: p?.id || undefined,
          payment_status: p?.status || undefined,
        };
      });

      setOrders(enriched);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(search, page);
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadOrders(search, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground text-sm">Panel de administración</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID de orden o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 input-field"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No se encontraron pedidos</p>
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Producto</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pago</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="table-row">
                      <td className="px-4 py-3 font-mono text-xs">
                        {order.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">{order.product_snapshot_name}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{order.shipping_name} {order.shipping_lastname}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {formatCurrency(order.total_amount, order.product_snapshot_currency as 'ARS' | 'BRL' | 'USD', 'es')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {order.payment_id ? (
                          <div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(order.payment_status || '')}`}>
                              {order.payment_status || '—'}
                            </span>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {order.payment_id.substring(0, 8)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin pago</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/order/${order.id}/thanks`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {page + 1}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage(p => p + 1)}
                className="gap-1"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
