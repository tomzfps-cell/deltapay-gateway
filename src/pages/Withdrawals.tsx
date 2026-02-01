import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatUSDT, formatDate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Wallet, ArrowUpRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Withdrawal {
  id: string;
  amount: number;
  status: 'requested' | 'approved' | 'sent' | 'completed' | 'failed';
  walletAddress: string;
  txHash?: string;
  requestedAt: Date;
  completedAt?: Date;
}

const mockWithdrawals: Withdrawal[] = [
  { id: 'wit_001', amount: 500.00, status: 'completed', walletAddress: '0x1234...5678', txHash: '0xabc...def', requestedAt: new Date(Date.now() - 86400000 * 2), completedAt: new Date(Date.now() - 86400000) },
  { id: 'wit_002', amount: 1250.50, status: 'sent', walletAddress: '0x1234...5678', requestedAt: new Date(Date.now() - 86400000) },
  { id: 'wit_003', amount: 750.00, status: 'approved', walletAddress: '0x1234...5678', requestedAt: new Date(Date.now() - 3600000 * 12) },
  { id: 'wit_004', amount: 200.00, status: 'requested', walletAddress: '0x1234...5678', requestedAt: new Date(Date.now() - 3600000 * 2) },
];

const statusConfig = {
  requested: { label: 'Solicitado', class: 'badge-pending', icon: Clock },
  approved: { label: 'Aprobado', class: 'bg-primary/15 text-primary border border-primary/20', icon: CheckCircle2 },
  sent: { label: 'Enviado', class: 'bg-primary/15 text-primary border border-primary/20', icon: ArrowUpRight },
  completed: { label: 'Completado', class: 'badge-confirmed', icon: CheckCircle2 },
  failed: { label: 'Fallido', class: 'badge-failed', icon: AlertCircle },
};

export const Withdrawals: React.FC = () => {
  const { t, locale } = useApp();

  const availableBalance = 12254.38;
  const pendingBalance = 2450.75;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('withdrawals')}</h1>
          <p className="text-muted-foreground">
            Retira tus fondos a tu wallet USDT
          </p>
        </div>
        <Button className="gap-2 btn-primary-glow">
          <Wallet className="h-4 w-4" />
          {t('requestWithdrawal')}
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="metric-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-success/10 p-4 text-success">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="stat-label">{t('availableBalance')}</p>
              <p className="stat-value text-gradient">{formatUSDT(availableBalance)}</p>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-warning/10 p-4 text-warning">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="stat-label">Pendiente de acreditación</p>
              <p className="stat-value">{formatUSDT(pendingBalance)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Configuration */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">{t('walletAddress')}</h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3">
              <code className="flex-1 font-mono text-sm">
                0x742d35Cc6634C0532925a3b844Bc9e7595f8b4E8
              </code>
              <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                TRC-20
              </span>
            </div>
          </div>
          <Button variant="outline">Cambiar Wallet</Button>
        </div>
      </div>

      {/* Withdrawals History */}
      <div className="glass rounded-xl">
        <div className="border-b border-border/50 px-6 py-4">
          <h3 className="text-lg font-semibold">Historial de Retiros</h3>
        </div>
        <div className="divide-y divide-border/50">
          {mockWithdrawals.map((withdrawal) => {
            const status = statusConfig[withdrawal.status];
            const StatusIcon = status.icon;

            return (
              <div key={withdrawal.id} className="table-row flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-mono font-medium">{formatUSDT(withdrawal.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(withdrawal.requestedAt, locale)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn('badge-status flex items-center gap-1', status.class)}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                  {withdrawal.txHash && (
                    <code className="hidden rounded bg-muted/50 px-2 py-1 text-xs font-mono sm:block">
                      {withdrawal.txHash}
                    </code>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Withdrawals;
