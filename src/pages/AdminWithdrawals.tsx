import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatUSDT, formatDate } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import {
  Clock, CheckCircle2, XCircle, ArrowUpRight, Loader2, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type PayoutStatus = 'requested' | 'approved' | 'sent' | 'completed' | 'failed';

interface PayoutRow {
  id: string;
  merchant_id: string;
  amount_usdt: number;
  status: PayoutStatus;
  wallet_address: string;
  wallet_network: string;
  requested_at: string;
  approved_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  tx_hash: string | null;
  merchant_name: string;
  merchant_email: string;
}

const statusConfig: Record<PayoutStatus, { label: string; className: string; icon: React.ElementType }> = {
  requested: { label: 'Solicitado', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  approved: { label: 'Aprobado', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  sent: { label: 'Enviado', className: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: ArrowUpRight },
  completed: { label: 'Completado', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  failed: { label: 'Fallido', className: 'bg-red-100 text-red-600 border-red-200', icon: XCircle },
};

const useAdminPayouts = (statusFilter: PayoutStatus | 'all') => {
  return useQuery({
    queryKey: ['admin-payouts', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('payouts')
        .select('*, merchants!inner(business_name, email)')
        .order('requested_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        merchant_name: p.merchants?.business_name || '—',
        merchant_email: p.merchants?.email || '—',
      })) as PayoutRow[];
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
};

const StatusBadge: React.FC<{ status: PayoutStatus }> = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.requested;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', cfg.className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

const FILTERS: { value: PayoutStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'requested', label: 'Solicitados' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'sent', label: 'Enviados' },
  { value: 'completed', label: 'Completados' },
  { value: 'failed', label: 'Fallidos' },
];

export const AdminWithdrawals: React.FC = () => {
  const { locale } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('requested');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: payouts, isLoading } = useAdminPayouts(statusFilter);

  const updateStatus = async (payoutId: string, newStatus: PayoutStatus, extra?: { tx_hash?: string; failure_reason?: string }) => {
    setProcessingId(payoutId);
    try {
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === 'approved') updates.approved_at = new Date().toISOString();
      if (newStatus === 'sent') updates.sent_at = new Date().toISOString();
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      if (newStatus === 'failed') {
        updates.failed_at = new Date().toISOString();
        updates.failure_reason = extra?.failure_reason || 'Rechazado por administrador';
      }
      if (extra?.tx_hash) updates.tx_hash = extra.tx_hash;

      const { error } = await supabase
        .from('payouts')
        .update(updates)
        .eq('id', payoutId);

      if (error) throw error;

      const labels: Record<string, string> = {
        approved: 'Retiro aprobado',
        sent: 'Retiro marcado como enviado',
        completed: 'Retiro completado',
        failed: 'Retiro rechazado',
      };

      toast({ title: labels[newStatus] || 'Actualizado' });
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      setExpandedId(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = (id: string) => updateStatus(id, 'approved');
  const handleReject = (id: string) => updateStatus(id, 'failed');
  const handleMarkSent = (id: string) => {
    const txHash = window.prompt('Hash de transacción (opcional):') ?? undefined;
    updateStatus(id, 'sent', { tx_hash: txHash || undefined });
  };
  const handleComplete = (id: string) => updateStatus(id, 'completed');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Gestión de <span className="text-gradient">Retiros</span>
        </h1>
        <p className="text-muted-foreground">Aprobá, rechazá y gestioná los retiros de los merchants</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/60'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : payouts?.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay retiros en este estado</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Merchant</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Monto</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Solicitado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Wallet</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {payouts?.map((payout) => (
                  <React.Fragment key={payout.id}>
                    <tr
                      className="table-row cursor-pointer"
                      onClick={() => setExpandedId(expandedId === payout.id ? null : payout.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{payout.merchant_name}</p>
                        <p className="text-xs text-muted-foreground">{payout.merchant_email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {formatUSDT(payout.amount_usdt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={payout.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(new Date(payout.requested_at), locale)}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-muted-foreground truncate max-w-[120px] block">
                          {payout.wallet_address.slice(0, 12)}...
                        </code>
                        <span className="text-xs text-muted-foreground">{payout.wallet_network}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {payout.status === 'requested' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs"
                                disabled={processingId === payout.id}
                                onClick={(e) => { e.stopPropagation(); handleApprove(payout.id); }}
                              >
                                {processingId === payout.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aprobar'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                disabled={processingId === payout.id}
                                onClick={(e) => { e.stopPropagation(); handleReject(payout.id); }}
                              >
                                Rechazar
                              </Button>
                            </>
                          )}
                          {payout.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={processingId === payout.id}
                              onClick={(e) => { e.stopPropagation(); handleMarkSent(payout.id); }}
                            >
                              {processingId === payout.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Marcar enviado'}
                            </Button>
                          )}
                          {payout.status === 'sent' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={processingId === payout.id}
                              onClick={(e) => { e.stopPropagation(); handleComplete(payout.id); }}
                            >
                              {processingId === payout.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Completar'}
                            </Button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === payout.id ? null : payout.id); }}
                            className="ml-1 text-muted-foreground hover:text-foreground"
                          >
                            {expandedId === payout.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Fila expandible con detalles */}
                    {expandedId === payout.id && (
                      <tr className="bg-muted/10">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">ID del retiro</p>
                              <code className="font-mono text-xs">{payout.id}</code>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Wallet completa</p>
                              <code className="font-mono text-xs break-all">{payout.wallet_address}</code>
                            </div>
                            {payout.tx_hash && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">TX Hash</p>
                                <code className="font-mono text-xs break-all">{payout.tx_hash}</code>
                              </div>
                            )}
                            {payout.approved_at && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Aprobado el</p>
                                <p className="text-xs">{formatDate(new Date(payout.approved_at), locale)}</p>
                              </div>
                            )}
                            {payout.failure_reason && (
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground mb-1">Motivo de rechazo</p>
                                <p className="text-xs text-destructive">{payout.failure_reason}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;
