import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Globe, Shield, CreditCard, Bell, Building2, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
  const { t, locale, currency, setLocale, setCurrency } = useApp();
  const { merchant, settings, signOut, refreshMerchant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Profile form
  const [profileData, setProfileData] = useState({
    business_name: '',
    legal_name: '',
    tax_id: '',
    email: '',
    phone: '',
  });

  // Payment data form
  const [paymentData, setPaymentData] = useState({
    bank_alias: '',
    bank_cbu: '',
    bank_instructions: '',
    usdt_wallet_address: '',
    usdt_wallet_network: 'TRC20',
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [isSaving, setIsSaving] = useState<string | null>(null);

  // Initialize form data from merchant
  useEffect(() => {
    if (merchant) {
      setProfileData({
        business_name: merchant.business_name || '',
        legal_name: merchant.legal_name || '',
        tax_id: merchant.tax_id || '',
        email: merchant.email || '',
        phone: merchant.phone || '',
      });
      setPaymentData({
        bank_alias: merchant.bank_alias || '',
        bank_cbu: merchant.bank_cbu || '',
        bank_instructions: merchant.bank_instructions || '',
        usdt_wallet_address: merchant.usdt_wallet_address || '',
        usdt_wallet_network: merchant.usdt_wallet_network || 'TRC20',
      });
    }
  }, [merchant]);

  const handleSaveProfile = async () => {
    if (!merchant?.id) return;
    setIsSaving('profile');

    try {
      const { error } = await supabase
        .from('merchants')
        .update(profileData)
        .eq('id', merchant.id);

      if (error) throw error;

      toast({ title: 'Perfil actualizado' });
      refreshMerchant();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(null);
    }
  };

  const handleSavePayment = async () => {
    if (!merchant?.id) return;
    setIsSaving('payment');

    try {
      const { error } = await supabase
        .from('merchants')
        .update(paymentData)
        .eq('id', merchant.id);

      if (error) throw error;

      toast({ title: 'Datos de cobro actualizados' });
      refreshMerchant();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(null);
    }
  };

  const handleSavePreferences = async () => {
    if (!settings?.id) return;
    setIsSaving('preferences');

    try {
      const { error } = await supabase
        .from('merchant_settings')
        .update({
          locale,
          display_currency: currency,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({ title: 'Preferencias guardadas' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(null);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }

    if (passwordData.new.length < 8) {
      toast({ title: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' });
      return;
    }

    setIsSaving('password');

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new,
      });

      if (error) throw error;

      toast({ title: 'Contraseña actualizada' });
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('settings')}</h1>
          <p className="text-muted-foreground">
            Configura tu cuenta y preferencias
          </p>
        </div>
        <Button variant="outline" className="gap-2 text-destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
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
                <Label>Nombre Comercial</Label>
                <Input
                  value={profileData.business_name}
                  onChange={(e) => setProfileData({ ...profileData, business_name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <Label>Razón Social</Label>
                <Input
                  value={profileData.legal_name}
                  onChange={(e) => setProfileData({ ...profileData, legal_name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <Label>CUIT/CNPJ</Label>
                <Input
                  value={profileData.tax_id}
                  onChange={(e) => setProfileData({ ...profileData, tax_id: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <Label>Email de Contacto</Label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <Button 
              className="mt-6" 
              onClick={handleSaveProfile}
              disabled={isSaving === 'profile'}
            >
              {isSaving === 'profile' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('save')}
            </Button>
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
            </div>
            <Button 
              className="mt-6" 
              onClick={handleSavePreferences}
              disabled={isSaving === 'preferences'}
            >
              {isSaving === 'preferences' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('save')}
            </Button>
          </div>
        </TabsContent>

        {/* Payment Data Tab */}
        <TabsContent value="payment" className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6">Datos Bancarios para Cobro</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Alias</Label>
                <Input
                  value={paymentData.bank_alias}
                  onChange={(e) => setPaymentData({ ...paymentData, bank_alias: e.target.value })}
                  className="input-field font-mono"
                  placeholder="MI.ALIAS.PAGOS"
                />
              </div>
              <div className="space-y-2">
                <Label>CBU / CVU</Label>
                <Input
                  value={paymentData.bank_cbu}
                  onChange={(e) => setPaymentData({ ...paymentData, bank_cbu: e.target.value })}
                  className="input-field font-mono"
                  placeholder="0000003100012345678901"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Instrucciones para el pagador</Label>
                <Textarea
                  value={paymentData.bank_instructions}
                  onChange={(e) => setPaymentData({ ...paymentData, bank_instructions: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Transferí el monto exacto incluyendo la referencia en el concepto."
                />
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6">Wallet USDT para Retiros</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Dirección de Wallet</Label>
                <Input
                  value={paymentData.usdt_wallet_address}
                  onChange={(e) => setPaymentData({ ...paymentData, usdt_wallet_address: e.target.value })}
                  className="input-field font-mono"
                  placeholder="T..."
                />
              </div>
              <div className="space-y-2">
                <Label>Red</Label>
                <Select 
                  value={paymentData.usdt_wallet_network} 
                  onValueChange={(v) => setPaymentData({ ...paymentData, usdt_wallet_network: v })}
                >
                  <SelectTrigger className="input-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRC20">TRC-20 (Tron)</SelectItem>
                    <SelectItem value="ERC20">ERC-20 (Ethereum)</SelectItem>
                    <SelectItem value="BEP20">BEP-20 (BSC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ⚠️ Verificá que la dirección y red sean correctas. Los retiros a direcciones incorrectas no son recuperables.
            </p>
            <Button 
              className="mt-6" 
              onClick={handleSavePayment}
              disabled={isSaving === 'payment'}
            >
              {isSaving === 'payment' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('save')}
            </Button>
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
                <Label>Nueva Contraseña</Label>
                <Input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Nueva Contraseña</Label>
                <Input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <Button 
              className="mt-6"
              onClick={handleChangePassword}
              disabled={isSaving === 'password' || !passwordData.new}
            >
              {isSaving === 'password' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Actualizar Contraseña
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
