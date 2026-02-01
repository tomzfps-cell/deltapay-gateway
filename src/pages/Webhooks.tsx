import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatDate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Plus, MoreVertical, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastTriggered?: Date;
  lastStatus?: 'success' | 'failed';
}

const mockWebhooks: Webhook[] = [
  { id: 'wh_001', url: 'https://api.minegocio.com/webhooks/deltapay', events: ['payment.confirmed', 'payment.failed'], active: true, lastTriggered: new Date(Date.now() - 3600000), lastStatus: 'success' },
  { id: 'wh_002', url: 'https://hooks.slack.com/services/xxx/yyy', events: ['payment.confirmed'], active: true, lastTriggered: new Date(Date.now() - 7200000), lastStatus: 'success' },
  { id: 'wh_003', url: 'https://n8n.example.com/webhook/deltapay', events: ['withdrawal.completed'], active: false },
];

const eventLabels: Record<string, string> = {
  'payment.confirmed': 'Pago Confirmado',
  'payment.failed': 'Pago Fallido',
  'payment.expired': 'Pago Expirado',
  'withdrawal.completed': 'Retiro Completado',
};

export const Webhooks: React.FC = () => {
  const { t, locale } = useApp();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('webhooks')}</h1>
          <p className="text-muted-foreground">
            Configura endpoints para recibir notificaciones en tiempo real
          </p>
        </div>
        <Button className="gap-2 btn-primary-glow">
          <Plus className="h-4 w-4" />
          Agregar Webhook
        </Button>
      </div>

      {/* Info Card */}
      <div className="glass rounded-xl border-primary/20 bg-primary/5 p-6">
        <h3 className="font-semibold text-primary">🔐 Firma HMAC</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Todos los webhooks son firmados con HMAC-SHA256. Verifica la firma en el header{' '}
          <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-xs">X-DeltaPay-Signature</code>
        </p>
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {mockWebhooks.map((webhook) => (
          <div
            key={webhook.id}
            className={cn(
              'glass rounded-xl p-6 transition-all',
              !webhook.active && 'opacity-60'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      webhook.active ? 'bg-success' : 'bg-muted-foreground'
                    )}
                  />
                  <code className="text-sm font-mono break-all">{webhook.url}</code>
                </div>

                <div className="flex flex-wrap gap-2">
                  {webhook.events.map((event) => (
                    <span
                      key={event}
                      className="rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium"
                    >
                      {eventLabels[event] || event}
                    </span>
                  ))}
                </div>

                {webhook.lastTriggered && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {webhook.lastStatus === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    Último envío: {formatDate(webhook.lastTriggered, locale)}
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-strong">
                  <DropdownMenuItem className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Enviar prueba
                  </DropdownMenuItem>
                  <DropdownMenuItem>Editar</DropdownMenuItem>
                  <DropdownMenuItem>Ver logs</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Webhooks;
