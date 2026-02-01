import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatDate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Plus, Copy, Eye, EyeOff, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsed?: Date;
  createdAt: Date;
  mode: 'test' | 'live';
}

const mockApiKeys: ApiKey[] = [
  { id: 'key_001', name: 'Producción Principal', prefix: 'sk_live_...8x4f', lastUsed: new Date(), createdAt: new Date(Date.now() - 86400000 * 30), mode: 'live' },
  { id: 'key_002', name: 'Backend Server', prefix: 'sk_live_...2m9k', lastUsed: new Date(Date.now() - 3600000), createdAt: new Date(Date.now() - 86400000 * 15), mode: 'live' },
  { id: 'key_003', name: 'Desarrollo Local', prefix: 'sk_test_...7j3n', lastUsed: new Date(Date.now() - 86400000 * 2), createdAt: new Date(Date.now() - 86400000 * 7), mode: 'test' },
];

export const ApiKeys: React.FC = () => {
  const { t, locale } = useApp();
  const [showSecret, setShowSecret] = useState<string | null>(null);

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
        <Button className="gap-2 btn-primary-glow">
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
          {mockApiKeys.map((key) => (
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
                  <code className="font-mono">
                    {showSecret === key.id ? 'sk_live_RealSecretKeyHere123456' : key.prefix}
                  </code>
                  {key.lastUsed && (
                    <span>Último uso: {formatDate(key.lastUsed, locale)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSecret(showSecret === key.id ? null : key.id)}
                >
                  {showSecret === key.id ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
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
    </div>
  );
};

export default ApiKeys;
