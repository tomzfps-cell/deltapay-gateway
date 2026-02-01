import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { User, Globe, Shield, CreditCard, Bell, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const Settings: React.FC = () => {
  const { t, locale, currency, setLocale, setCurrency } = useApp();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('settings')}</h1>
        <p className="text-muted-foreground">
          Configura tu cuenta y preferencias
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="glass h-auto flex-wrap gap-2 bg-transparent p-1">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <User className="h-4 w-4" />
            {t('profile')}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Globe className="h-4 w-4" />
            {t('preferences')}
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <CreditCard className="h-4 w-4" />
            Datos de Cobro
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Shield className="h-4 w-4" />
            {t('security')}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Información del Negocio</h3>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre del Negocio</Label>
                <Input defaultValue="Mi Negocio SRL" className="input-field" />
              </div>
              <div className="space-y-2">
                <Label>CUIT</Label>
                <Input defaultValue="30-12345678-9" className="input-field" />
              </div>
              <div className="space-y-2">
                <Label>Email de Contacto</Label>
                <Input type="email" defaultValue="contacto@minegocio.com" className="input-field" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input defaultValue="+54 11 1234-5678" className="input-field" />
              </div>
            </div>
            <Button className="mt-6">{t('save')}</Button>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6">Preferencias de Visualización</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('language')}</Label>
                <Select value={locale} onValueChange={(v) => setLocale(v as any)}>
                  <SelectTrigger className="input-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-strong">
                    <SelectItem value="es">🇦🇷 Español (Argentina)</SelectItem>
                    <SelectItem value="pt">🇧🇷 Português (Brasil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('currency')} (Display)</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
                  <SelectTrigger className="input-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-strong">
                    <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                    <SelectItem value="BRL">BRL - Real Brasileño</SelectItem>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Zona Horaria</Label>
                <Select defaultValue="america_buenos_aires">
                  <SelectTrigger className="input-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-strong">
                    <SelectItem value="america_buenos_aires">America/Buenos_Aires (GMT-3)</SelectItem>
                    <SelectItem value="america_sao_paulo">America/Sao_Paulo (GMT-3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="mt-6">{t('save')}</Button>
          </div>
        </TabsContent>

        {/* Payment Data Tab */}
        <TabsContent value="payment" className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6">Datos Bancarios para Cobro</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Alias</Label>
                <Input defaultValue="MINEGOCIO.PAGOS" className="input-field font-mono" />
              </div>
              <div className="space-y-2">
                <Label>CBU / CVU</Label>
                <Input defaultValue="0000003100012345678901" className="input-field font-mono" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Instrucciones para el pagador</Label>
                <textarea
                  className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                  defaultValue="Transferí el monto exacto y envianos el comprobante por WhatsApp."
                />
              </div>
            </div>
            <Button className="mt-6">{t('save')}</Button>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6">Wallet USDT para Retiros</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Dirección de Wallet (TRC-20)</Label>
                <Input
                  defaultValue="0x742d35Cc6634C0532925a3b844Bc9e7595f8b4E8"
                  className="input-field font-mono"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                ⚠️ Verificá que la dirección sea correcta. Los retiros a direcciones incorrectas no son recuperables.
              </p>
            </div>
            <Button className="mt-6">{t('save')}</Button>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6">Notificaciones Push</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ventas Confirmadas</p>
                  <p className="text-sm text-muted-foreground">
                    Recibí una notificación cada vez que se confirma un pago
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Retiros Completados</p>
                  <p className="text-sm text-muted-foreground">
                    Notificación cuando un retiro se procesa exitosamente
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertas de Seguridad</p>
                  <p className="text-sm text-muted-foreground">
                    Nuevos logins y cambios en la cuenta
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6">Cambiar Contraseña</h3>
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Contraseña Actual</Label>
                <Input type="password" className="input-field" />
              </div>
              <div className="space-y-2">
                <Label>Nueva Contraseña</Label>
                <Input type="password" className="input-field" />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Nueva Contraseña</Label>
                <Input type="password" className="input-field" />
              </div>
            </div>
            <Button className="mt-6">Actualizar Contraseña</Button>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Sesiones Activas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-4">
                <div>
                  <p className="font-medium">Chrome en MacOS</p>
                  <p className="text-sm text-muted-foreground">Buenos Aires, Argentina · Ahora</p>
                </div>
                <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                  Sesión actual
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-4">
                <div>
                  <p className="font-medium">Safari en iPhone</p>
                  <p className="text-sm text-muted-foreground">Buenos Aires, Argentina · Hace 2 horas</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive">
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
