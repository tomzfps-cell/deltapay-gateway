import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Plus, Copy, Eye, EyeOff, Trash2, AlertTriangle, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Simple hash function for demo (in production, use server-side hashing)
const generateApiKey = (mode: string) => {
  const prefix = mode === 'live' ? 'sk_live_' : 'sk_test_';
  const random = Array.from({ length: 32 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
  ).join('');
  return prefix + random;
};

const hashKey = async (key: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const ApiKeys: React.FC = () => {
  const { t, locale } = useApp();
  const { merchant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMode, setFormMode] = useState<'live' | 'test'>('live');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['merchant-api-keys', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) throw new Error('No merchant');
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('merchant_id', merchant.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!merchant?.id,
  });

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast({ title: 'Ingresa un nombre para la API key', variant: 'destructive' });
      return;
    }
    if (!merchant?.id) return;

    setIsCreating(true);

    try {
      const fullKey = generateApiKey(formMode);
      const keyHash = await hashKey(fullKey);
      const keyPrefix = fullKey.substring(0, 12) + '...' + fullKey.slice(-4);

      const { error } = await supabase.from('api_keys').insert({
        merchant_id: merchant.id,
        name: formName,
        mode: formMode,
        key_prefix: keyPrefix,
        key_hash: keyHash,
      });

      if (error) throw error;

      setNewKeyRevealed(fullKey);
      queryClient.invalidateQueries({ queryKey: ['merchant-api-keys'] });
      toast({ title: 'API Key creada' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'API Key eliminada' });
      queryClient.invalidateQueries({ queryKey: ['merchant-api-keys'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setNewKeyRevealed(null);
    setFormName('');
    setFormMode('live');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('apiKeys')}</h1>
          <p className="text-muted-foreground">
            Gestiona tus claves de API para integración
          </p>
        </div>
        <Button className="gap-2 btn-primary-glow" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Crear API Key
        </Button>
      </div>

      {/* Warning */}
      <div className="glass rounded-xl border-warning/20 bg-warning/5 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium text-warning">Mantén tus claves seguras</p>
            <p className="mt-1 text-muted-foreground">
              Nunca compartas tus API keys ni las expongas en código frontend.
              Las claves tienen acceso completo a tu cuenta.
            </p>
          </div>
        </div>
      </div>

      {/* Keys List */}
      <div className="glass rounded-xl">
        <div className="border-b border-border/50 px-6 py-4">
          <h3 className="font-semibold">Claves Activas</h3>
        </div>
        <div className="divide-y divide-border/50">
          {isLoading ? (
            Array(2).fill(0).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))
          ) : apiKeys?.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              No tienes API keys activas
            </div>
          ) : (
            apiKeys?.map((key) => (
              <div key={key.id} className="table-row flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{key.name}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        key.mode === 'live'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      )}
                    >
                      {key.mode === 'live' ? 'Producción' : 'Test'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <code className="font-mono">{key.key_prefix}</code>
                    {key.last_used_at && (
                      <span>Último uso: {formatDate(new Date(key.last_used_at), locale)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(key.key_prefix, key.id)}
                  >
                    {copiedId === key.id ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Documentation Link */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold">Documentación API</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Consulta nuestra documentación para integrar DeltaPay en tu aplicación.
        </p>
        <Button variant="outline" className="mt-4">
          Ver Documentación →
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear API Key</DialogTitle>
            <DialogDescription>
              {newKeyRevealed
                ? 'Guarda esta clave, no la podrás ver de nuevo.'
                : 'Genera una nueva clave para tu integración'}
            </DialogDescription>
          </DialogHeader>

          {newKeyRevealed ? (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-success/10 border border-success/20 p-4">
                <p className="text-sm text-success font-medium mb-2">Tu nueva API Key:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm break-all">{newKeyRevealed}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(newKeyRevealed, 'new')}
                  >
                    {copiedId === 'new' ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm text-warning">
                ⚠️ Guarda esta clave ahora. No podrás verla de nuevo.
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Backend Server"
                  className="input-field"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mode">Entorno</Label>
                <Select value={formMode} onValueChange={(v) => setFormMode(v as 'live' | 'test')}>
                  <SelectTrigger className="input-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Producción (Live)</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            {newKeyRevealed ? (
              <Button onClick={closeDialog}>Cerrar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={isCreating} className="btn-primary-glow">
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Crear
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiKeys;
