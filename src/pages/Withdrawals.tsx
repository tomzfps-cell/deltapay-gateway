import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMerchantBalance, useMerchantPayouts } from '@/hooks/useMerchantData';
import { supabase } from '@/integrations/supabase/client';
import { formatUSDT, formatDate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Wallet, ArrowUpRight, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  requested: { label: 'Solicitado', class: 'badge-pending', icon: Clock },
  approved: { label: 'Aprobado', class: 'bg-primary/15 text-primary border border-primary/20', icon: CheckCircle2 },
  sent: { label: 'Enviado', class: 'bg-primary/15 text-primary border border-primary/20', icon: ArrowUpRight },
  completed: { label: 'Completado', class: 'badge-confirmed', icon: CheckCircle2 },
  failed: { label: 'Fallido', class: 'badge-failed', icon: AlertCircle },
};

export const Withdrawals: React.FC = () => {
  const { t, locale } = useApp();
  const { merchant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: balance, isLoading: balanceLoading } = useMerchantBalance();
  const { data: payouts, isLoading: payoutsLoading } = useMerchantPayouts();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestWithdrawal = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: 'Monto inválido', variant: 'destructive' });
      return;
    }

    if (!merchant?.usdt_wallet_address) {
      toast({ 
        title: 'Wallet no configurada', 
        description: 'Configurá tu wallet USDT en Configuración antes de solicitar un retiro.',
        variant: 'destructive' 
      });
      return;
    }

    if (numAmount > (balance?.balance_available || 0)) {
      toast({ title: 'Saldo insuficiente', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('request_payout', {
        _merchant_id: merchant.id,
        _amount_usdt: numAmount,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; payout_id?: string };

      if (!result.success) {
        throw new Error(result.error || 'Error al solicitar retiro');
      }

      toast({ title: 'Retiro solicitado', description: `ID: ${result.payout_id}` });
      setIsDialogOpen(false);
      setAmount('');
      queryClient.invalidateQueries({ queryKey: ['merchant-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-balance'] });
    } catch (err: any) {
      console.error('Error requesting payout:', err);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo solicitar el retiro',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Button 
          className="gap-2 btn-primary-glow" 
          onClick={() => setIsDialogOpen(true)}
          disabled={!merchant?.usdt_wallet_address}
        >
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
              {balanceLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="stat-value text-gradient">{formatUSDT(balance?.balance_available || 0)}</p>
              )}
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
              {balanceLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="stat-value">{formatUSDT(balance?.balance_pending || 0)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Configuration */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">{t('walletAddress')}</h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            {merchant?.usdt_wallet_address ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3">
                <code className="flex-1 font-mono text-sm truncate">
                  {merchant.usdt_wallet_address}
                </code>
                <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success shrink-0">
                  {merchant.usdt_wallet_network || 'TRC-20'}
                </span>
              </div>
            ) : (
              <div className="rounded-lg bg-warning/10 border border-warning/20 px-4 py-3 text-sm text-warning">
                No hay wallet configurada. Configurala en Configuración → Datos de Cobro.
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/settings'}>
            {merchant?.usdt_wallet_address ? 'Cambiar Wallet' : 'Configurar Wallet'}
          </Button>
        </div>
      </div>

      {/* Withdrawals History */}
      <div className="glass rounded-xl">
        <div className="border-b border-border/50 px-6 py-4">
          <h3 className="text-lg font-semibold">Historial de Retiros</h3>
        </div>
        <div className="divide-y divide-border/50">
          {payoutsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))
          ) : payouts?.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              No hay retiros aún
            </div>
          ) : (
            payouts?.map((payout) => {
              const status = statusConfig[payout.status as keyof typeof statusConfig] || statusConfig.requested;
              const StatusIcon = status.icon;

              return (
                <div key={payout.id} className="table-row flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono font-medium">{formatUSDT(payout.amount_usdt)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(new Date(payout.requested_at), locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn('badge-status flex items-center gap-1', status.class)}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                    {payout.tx_hash && (
                      <code className="hidden rounded bg-muted/50 px-2 py-1 text-xs font-mono sm:block">
                        {payout.tx_hash.slice(0, 10)}...
                      </code>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Request Withdrawal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Retiro</DialogTitle>
            <DialogDescription>
              El retiro se enviará a tu wallet configurada en USDT.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Disponible</p>
              <p className="text-2xl font-bold text-gradient">
                {formatUSDT(balance?.balance_available || 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto a retirar (USDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={balance?.balance_available || 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input-field font-mono text-lg"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAmount(String(balance?.balance_available || 0))}
              >
                Retirar todo
              </Button>
            </div>

            <div className="rounded-lg bg-muted/30 p-4 text-sm">
              <p className="text-muted-foreground">Se enviará a:</p>
              <code className="font-mono text-xs break-all">
                {merchant?.usdt_wallet_address}
              </code>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRequestWithdrawal} 
              disabled={isSubmitting || !amount}
              className="btn-primary-glow"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar Retiro'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Withdrawals;
