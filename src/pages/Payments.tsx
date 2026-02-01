import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Search, Filter, Download, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Payment {
  id: string;
  amount: number;
  currency: 'ARS' | 'BRL' | 'USD';
  amountUSDT: number;
  status: 'confirmed' | 'pending' | 'failed' | 'expired';
  customer: string;
  email: string;
  date: Date;
  method: 'qr' | 'transfer';
}

const mockPayments: Payment[] = [
  { id: 'pay_abc123', amount: 45000, currency: 'ARS', amountUSDT: 36.29, status: 'confirmed', customer: 'Juan Pérez', email: 'juan@email.com', date: new Date(), method: 'qr' },
  { id: 'pay_def456', amount: 128500, currency: 'ARS', amountUSDT: 103.63, status: 'pending', customer: 'María García', email: 'maria@email.com', date: new Date(Date.now() - 3600000), method: 'transfer' },
  { id: 'pay_ghi789', amount: 89200, currency: 'ARS', amountUSDT: 71.93, status: 'confirmed', customer: 'Carlos López', email: 'carlos@email.com', date: new Date(Date.now() - 7200000), method: 'qr' },
  { id: 'pay_jkl012', amount: 15000, currency: 'ARS', amountUSDT: 12.10, status: 'failed', customer: 'Ana Rodríguez', email: 'ana@email.com', date: new Date(Date.now() - 14400000), method: 'transfer' },
  { id: 'pay_mno345', amount: 256000, currency: 'ARS', amountUSDT: 206.45, status: 'confirmed', customer: 'Luis Fernández', email: 'luis@email.com', date: new Date(Date.now() - 21600000), method: 'qr' },
  { id: 'pay_pqr678', amount: 78000, currency: 'ARS', amountUSDT: 62.90, status: 'expired', customer: 'Sofia Martínez', email: 'sofia@email.com', date: new Date(Date.now() - 86400000), method: 'transfer' },
];

const statusConfig = {
  confirmed: { label: 'Confirmado', class: 'badge-confirmed' },
  pending: { label: 'Pendiente', class: 'badge-pending' },
  failed: { label: 'Fallido', class: 'badge-failed' },
  expired: { label: 'Expirado', class: 'bg-muted/50 text-muted-foreground border border-border' },
};

const methodLabels = {
  qr: 'QR',
  transfer: 'Transferencia',
};

export const Payments: React.FC = () => {
  const { t, locale, currency: displayCurrency } = useApp();

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
            placeholder="Buscar por cliente, email o ID..."
            className="pl-10 input-field"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Estado
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
          <Button variant="outline" className="gap-2">
            Método
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ID
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cliente
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monto
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  USDT
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
              {mockPayments.map((payment) => {
                const status = statusConfig[payment.status];
                return (
                  <tr key={payment.id} className="table-row">
                    <td className="px-6 py-4">
                      <code className="rounded bg-muted/50 px-2 py-1 text-xs font-mono">
                        {payment.id}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{payment.customer}</p>
                        <p className="text-sm text-muted-foreground">{payment.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {formatCurrency(payment.amount, payment.currency, locale)}
                    </td>
                    <td className="px-6 py-4 font-mono text-primary">
                      {payment.amountUSDT.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{methodLabels[payment.method]}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('badge-status', status.class)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(payment.date, locale)}
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payments;
