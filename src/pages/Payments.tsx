import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useMerchantPayments } from '@/hooks/useMerchantData';
import { formatCurrency, formatDate, formatUSDT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Search, Filter, Download, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  confirmed: { label: 'Confirmado', class: 'badge-confirmed' },
  pending: { label: 'Pendiente', class: 'badge-pending' },
  failed: { label: 'Fallido', class: 'badge-failed' },
  expired: { label: 'Expirado', class: 'bg-muted/50 text-muted-foreground border border-border' },
  created: { label: 'Creado', class: 'bg-muted/50 text-muted-foreground border border-border' },
};

const methodLabels = {
  qr: 'QR',
  transfer: 'Transferencia',
};

export const Payments: React.FC = () => {
  const { t, locale } = useApp();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: payments, isLoading } = useMerchantPayments({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const filteredPayments = payments?.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.id.toLowerCase().includes(query) ||
      p.customer_name?.toLowerCase().includes(query) ||
      p.customer_email?.toLowerCase().includes(query) ||
      p.payment_reference?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('payments')}</h1>
          <p className="text-muted-foreground">
            Gestiona todos los pagos recibidos
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          {t('export')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, email o referencia..."
            className="pl-10 input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 input-field">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
              <SelectItem value="failed">Fallidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Referencia
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cliente
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monto
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  USDT Neto
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Método
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estado
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fecha
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4" colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredPayments?.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-muted-foreground" colSpan={8}>
                    No hay pagos que coincidan con tu búsqueda
                  </td>
                </tr>
              ) : (
                filteredPayments?.map((payment) => {
                  const status = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.pending;
                  return (
                    <tr key={payment.id} className="table-row">
                      <td className="px-6 py-4">
                        <code className="rounded bg-muted/50 px-2 py-1 text-xs font-mono">
                          {payment.payment_reference || payment.id.slice(0, 8)}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{payment.customer_name || 'Sin nombre'}</p>
                          <p className="text-sm text-muted-foreground">{payment.customer_email || '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {formatCurrency(payment.amount_local, payment.currency as 'ARS' | 'BRL' | 'USD', locale)}
                      </td>
                      <td className="px-6 py-4 font-mono text-primary">
                        {payment.amount_usdt_net ? formatUSDT(payment.amount_usdt_net) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{methodLabels[payment.payment_method as keyof typeof methodLabels] || payment.payment_method}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('badge-status', status.class)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(new Date(payment.created_at), locale)}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(`/pay/${payment.id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payments;
