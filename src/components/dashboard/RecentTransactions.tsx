import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatRelativeTime } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'payment' | 'withdrawal';
  amount: number;
  currency: 'ARS' | 'BRL' | 'USD';
  status: 'confirmed' | 'pending' | 'failed';
  customer?: string;
  date: Date;
}

const mockTransactions: Transaction[] = [
  {
    id: 'pay_001',
    type: 'payment',
    amount: 45000,
    currency: 'ARS',
    status: 'confirmed',
    customer: 'Juan Pérez',
    date: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: 'pay_002',
    type: 'payment',
    amount: 128500,
    currency: 'ARS',
    status: 'pending',
    customer: 'María García',
    date: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: 'wit_001',
    type: 'withdrawal',
    amount: 500,
    currency: 'USD',
    status: 'confirmed',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: 'pay_003',
    type: 'payment',
    amount: 89200,
    currency: 'ARS',
    status: 'confirmed',
    customer: 'Carlos López',
    date: new Date(Date.now() - 1000 * 60 * 60 * 4),
  },
  {
    id: 'pay_004',
    type: 'payment',
    amount: 15000,
    currency: 'ARS',
    status: 'failed',
    customer: 'Ana Rodríguez',
    date: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
];

const statusConfig = {
  confirmed: { label: 'Confirmado', class: 'badge-confirmed' },
  pending: { label: 'Pendiente', class: 'badge-pending' },
  failed: { label: 'Fallido', class: 'badge-failed' },
};

export const RecentTransactions: React.FC = () => {
  const { t, locale, currency: displayCurrency } = useApp();

  return (
    <div className="glass rounded-xl">
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <h3 className="text-lg font-semibold">{t('recentTransactions')}</h3>
        <button className="text-sm text-primary hover:text-primary/80 transition-colors">
          {t('viewAll')} →
        </button>
      </div>
      <div className="divide-y divide-border/50">
        {mockTransactions.map((tx) => {
          const status = statusConfig[tx.status];
          const isPayment = tx.type === 'payment';

          return (
            <div
              key={tx.id}
              className="table-row flex items-center justify-between gap-4 px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    isPayment
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  )}
                >
                  {isPayment ? (
                    <ArrowDownRight className="h-5 w-5" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {isPayment ? tx.customer : 'Retiro USDT'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatRelativeTime(tx.date, locale)}
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
                    isPayment ? 'text-success' : 'text-foreground'
                  )}
                >
                  {isPayment ? '+' : '-'}
                  {formatCurrency(tx.amount, tx.currency, locale)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
