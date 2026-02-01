import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Plus, MoreVertical, CheckCircle2, XCircle, RefreshCw, Loader2, Trash2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';

const eventLabels: Record<string, string> = {
  'payment.confirmed': 'Pago Confirmado',
  'payment.failed': 'Pago Fallido',
  'payment.expired': 'Pago Expirado',
  'payout.completed': 'Retiro Completado',
};

const availableEvents = Object.keys(eventLabels);

const webhookSchema = z.object({
  url: z.string().url('URL inválida').startsWith('https://', 'Debe usar HTTPS'),
  events: z.array(z.string()).min(1, 'Selecciona al menos un evento'),
});

export const Webhooks: React.FC = () => {
  const { t, locale } = useApp();
  const { merchant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>(['payment.confirmed']);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['merchant-webhooks', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) throw new Error('No merchant');
      const { data, error } = await supabase
        .from('webhooks')
        .select('*, deliveries:webhook_deliveries(id, response_status, created_at)')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!merchant?.id,
  });

  const openCreateDialog = () => {
    setEditingId(null);
    setFormUrl('');
    setFormEvents(['payment.confirmed']);
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (webhook: any) => {
    setEditingId(webhook.id);
    setFormUrl(webhook.url);
    setFormEvents(webhook.events || ['payment.confirmed']);
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setErrors({});
    const result = webhookSchema.safeParse({ url: formUrl, events: formEvents });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!merchant?.id) return;
    setIsSaving(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('webhooks')
          .update({ url: formUrl, events: formEvents })
          .eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Webhook actualizado' });
      } else {
        const { error } = await supabase
          .from('webhooks')
          .insert({ merchant_id: merchant.id, url: formUrl, events: formEvents });
        if (error) throw error;
        toast({ title: 'Webhook creado' });
      }

      queryClient.invalidateQueries({ queryKey: ['merchant-webhooks'] });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (webhook: any) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: !webhook.is_active })
        .eq('id', webhook.id);
      if (error) throw error;
      toast({ title: webhook.is_active ? 'Webhook desactivado' : 'Webhook activado' });
      queryClient.invalidateQueries({ queryKey: ['merchant-webhooks'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase.from('webhooks').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Webhook eliminado' });
      queryClient.invalidateQueries({ queryKey: ['merchant-webhooks'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleEvent = (event: string) => {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

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
        <Button className="gap-2 btn-primary-glow" onClick={openCreateDialog}>
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
        {isLoading ? (
          Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : webhooks?.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-muted-foreground mb-4">No tienes webhooks configurados</p>
            <Button onClick={openCreateDialog}>Crear tu primer webhook</Button>
          </div>
        ) : (
          webhooks?.map((webhook: any) => {
            const lastDelivery = webhook.deliveries?.[0];
            const lastStatus = lastDelivery?.response_status;
            const isSuccess = lastStatus && lastStatus >= 200 && lastStatus < 300;

            return (
              <div
                key={webhook.id}
                className={cn(
                  'glass rounded-xl p-6 transition-all',
                  !webhook.is_active && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          webhook.is_active ? 'bg-success' : 'bg-muted-foreground'
                        )}
                      />
                      <code className="text-sm font-mono break-all">{webhook.url}</code>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(webhook.events || []).map((event: string) => (
                        <span
                          key={event}
                          className="rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium"
                        >
                          {eventLabels[event] || event}
                        </span>
                      ))}
                    </div>

                    {lastDelivery && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {isSuccess ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        Último envío: {formatDate(new Date(lastDelivery.created_at), locale)}
                        {lastStatus && <span className="font-mono">({lastStatus})</span>}
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
                      <DropdownMenuItem onClick={() => openEditDialog(webhook)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(webhook)}>
                        {webhook.is_active ? (
                          <>
                            <PowerOff className="h-4 w-4 mr-2" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-2" />
                            Activar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteWebhook(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-strong sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Webhook' : 'Nuevo Webhook'}</DialogTitle>
            <DialogDescription>
              Configura la URL y los eventos que deseas recibir
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL del Endpoint *</Label>
              <Input
                id="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://api.tudominio.com/webhooks"
                className="input-field font-mono"
              />
              {errors.url && <p className="text-sm text-destructive">{errors.url}</p>}
            </div>

            <div className="space-y-2">
              <Label>Eventos *</Label>
              <div className="space-y-2">
                {availableEvents.map((event) => (
                  <div key={event} className="flex items-center gap-2">
                    <Checkbox
                      id={event}
                      checked={formEvents.includes(event)}
                      onCheckedChange={() => toggleEvent(event)}
                    />
                    <label htmlFor={event} className="text-sm cursor-pointer">
                      {eventLabels[event]}
                    </label>
                  </div>
                ))}
              </div>
              {errors.events && <p className="text-sm text-destructive">{errors.events}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-primary-glow">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Webhooks;
