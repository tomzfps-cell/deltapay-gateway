import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Paintbrush, Upload, Loader2, Eye, Plus, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckoutSplitLayout } from '@/components/checkout/CheckoutSplitLayout';
import { StepIndicator } from '@/components/checkout/StepIndicator';
import { ThemedButton } from '@/components/checkout/ThemedButton';
import { CheckoutTheme, themeToCSS } from '@/hooks/useCheckoutConfig';

interface ThemeFormData {
  brand_name: string;
  logo_path: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  button_radius: string;
  font_family: string;
  layout_style: string;
  locale_default: string;
  benefits: string[];
  trust_badges: string[];
}

const DEFAULT_FORM: ThemeFormData = {
  brand_name: '',
  logo_path: '',
  primary_color: '#06B6D4',
  secondary_color: '#0284C7',
  background_color: '#FAFAFA',
  text_color: '#111827',
  button_radius: 'md',
  font_family: 'Inter',
  layout_style: 'split',
  locale_default: 'es',
  benefits: [],
  trust_badges: [],
};

export const CheckoutAppearance: React.FC = () => {
  const { merchant } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ThemeFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newBenefit, setNewBenefit] = useState('');
  const [newBadge, setNewBadge] = useState('');

  // Load existing theme
  useEffect(() => {
    if (!merchant?.id) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('merchant_checkout_themes')
        .select('*')
        .eq('merchant_id', merchant.id)
        .maybeSingle();

      if (data) {
        setHasExisting(true);
        setForm({
          brand_name: data.brand_name || merchant.business_name || '',
          logo_path: data.logo_path || '',
          primary_color: data.primary_color || '#06B6D4',
          secondary_color: data.secondary_color || '#0284C7',
          background_color: data.background_color || '#FAFAFA',
          text_color: data.text_color || '#111827',
          button_radius: data.button_radius || 'md',
          font_family: data.font_family || 'Inter',
          layout_style: data.layout_style || 'split',
          locale_default: data.locale_default || 'es',
          benefits: (data.benefits_json as string[]) || [],
          trust_badges: (data.trust_badges_json as string[]) || [],
        });
      } else {
        setForm(prev => ({ ...prev, brand_name: merchant.business_name || '' }));
      }
      setLoading(false);
    };
    load();
  }, [merchant?.id]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !merchant?.id) return;

    setUploading(true);
    const path = `merchants/${merchant.id}/logo.${file.name.split('.').pop()}`;

    try {
      const { error } = await supabase.storage
        .from('merchant-assets')
        .upload(path, file, { upsert: true });

      if (error) throw error;
      setForm(prev => ({ ...prev, logo_path: path }));
      toast({ title: 'Logo subido' });
    } catch (err: any) {
      toast({ title: 'Error al subir', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!merchant?.id) return;
    setSaving(true);

    const payload = {
      merchant_id: merchant.id,
      brand_name: form.brand_name || null,
      logo_path: form.logo_path || null,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      background_color: form.background_color,
      text_color: form.text_color,
      button_radius: form.button_radius,
      font_family: form.font_family,
      layout_style: form.layout_style,
      locale_default: form.locale_default,
      benefits_json: form.benefits,
      trust_badges_json: form.trust_badges,
    };

    try {
      if (hasExisting) {
        const { error } = await supabase
          .from('merchant_checkout_themes')
          .update(payload)
          .eq('merchant_id', merchant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('merchant_checkout_themes')
          .insert(payload);
        if (error) throw error;
        setHasExisting(true);
      }
      toast({ title: 'Tema guardado correctamente' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addBenefit = () => {
    if (!newBenefit.trim()) return;
    setForm(prev => ({ ...prev, benefits: [...prev.benefits, newBenefit.trim()] }));
    setNewBenefit('');
  };

  const removeBenefit = (i: number) => {
    setForm(prev => ({ ...prev, benefits: prev.benefits.filter((_, idx) => idx !== i) }));
  };

  const addBadge = () => {
    if (!newBadge.trim()) return;
    setForm(prev => ({ ...prev, trust_badges: [...prev.trust_badges, newBadge.trim()] }));
    setNewBadge('');
  };

  const removeBadge = (i: number) => {
    setForm(prev => ({ ...prev, trust_badges: prev.trust_badges.filter((_, idx) => idx !== i) }));
  };

  const logoUrl = form.logo_path
    ? supabase.storage.from('merchant-assets').getPublicUrl(form.logo_path).data.publicUrl
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Paintbrush className="h-6 w-6 text-primary" />
            Apariencia del Checkout
          </h1>
          <p className="text-muted-foreground">Personalizá cómo ven tus clientes el checkout</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4" />
            {showPreview ? 'Ocultar preview' : 'Vista previa'}
          </Button>
          <Button className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </div>

      <div className={showPreview ? 'grid lg:grid-cols-2 gap-6' : ''}>
        {/* Form */}
        <div className="space-y-6">
          {/* Branding */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Marca</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre de marca</Label>
                <Input value={form.brand_name} onChange={(e) => setForm(prev => ({ ...prev, brand_name: e.target.value }))}
                  className="input-field" placeholder="Mi Tienda" />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 object-contain rounded" />}
                  <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleUploadLogo} />
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {form.logo_path ? 'Cambiar' : 'Subir logo'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Colores</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: 'primary_color', label: 'Color primario' },
                { key: 'secondary_color', label: 'Color secundario' },
                { key: 'background_color', label: 'Fondo' },
                { key: 'text_color', label: 'Texto' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={(form as any)[key]}
                      onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input value={(form as any)[key]}
                      onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                      className="input-field font-mono text-xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Layout & Typography */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Layout y tipografía</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select value={form.layout_style} onValueChange={(v) => setForm(prev => ({ ...prev, layout_style: v }))}>
                  <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="split">Split (2 columnas)</SelectItem>
                    <SelectItem value="single">Single (1 columna)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipografía</Label>
                <Select value={form.font_family} onValueChange={(v) => setForm(prev => ({ ...prev, font_family: v }))}>
                  <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                    <SelectItem value="DM Sans">DM Sans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Radio de botones</Label>
                <Select value={form.button_radius} onValueChange={(v) => setForm(prev => ({ ...prev, button_radius: v }))}>
                  <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Pequeño</SelectItem>
                    <SelectItem value="md">Mediano</SelectItem>
                    <SelectItem value="lg">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Idioma por defecto</Label>
              <Select value={form.locale_default} onValueChange={(v) => setForm(prev => ({ ...prev, locale_default: v }))}>
                <SelectTrigger className="input-field w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇦🇷 Español</SelectItem>
                  <SelectItem value="pt">🇧🇷 Português</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Benefits */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Beneficios (bullets)</h3>
            <div className="space-y-2">
              {form.benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm bg-muted/50 rounded px-3 py-1.5">{b}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeBenefit(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newBenefit} onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Ej: Envío gratis a todo el país" className="input-field"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())} />
                <Button variant="outline" size="sm" onClick={addBenefit}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Trust badges</h3>
            <div className="space-y-2">
              {form.trust_badges.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm bg-muted/50 rounded px-3 py-1.5">{b}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeBadge(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newBadge} onChange={(e) => setNewBadge(e.target.value)}
                  placeholder="Ej: Pago seguro" className="input-field"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBadge())} />
                <Button variant="outline" size="sm" onClick={addBadge}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="border border-border rounded-xl overflow-hidden shadow-lg">
            <div className="bg-muted/30 p-2 text-center text-xs text-muted-foreground border-b border-border">
              Vista previa del checkout
            </div>
            <div className="transform scale-[0.65] origin-top" style={{ height: '900px' }}>
              <CheckoutSplitLayout
                theme={{
                  ...form,
                  button_radius: form.button_radius as 'sm' | 'md' | 'lg',
                  layout_style: form.layout_style as 'split' | 'single',
                } as CheckoutTheme}
                logoUrl={logoUrl}
                heroImageUrl={null}
                checkoutTitle="Producto de ejemplo"
                productName="Producto de ejemplo"
                productDescription="Descripción del producto"
                productAmount={15000}
                shippingCost={0}
                totalAmount={15000}
                currency="ARS"
                benefits={form.benefits}
                trustBadges={form.trust_badges}
              >
                <StepIndicator currentStep="contact" primaryColor={form.primary_color} />
                <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold" style={{ color: form.text_color }}>Datos de contacto</h2>
                  <div className="space-y-3">
                    <Input placeholder="tu@email.com" className="bg-white border-gray-300" />
                    <Input placeholder="+54 9 11 1234-5678" className="bg-white border-gray-300" />
                  </div>
                  <ThemedButton primaryColor={form.primary_color} buttonRadius={form.button_radius as any}
                    className="w-full">
                    Continuar a envío
                  </ThemedButton>
                </div>
              </CheckoutSplitLayout>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutAppearance;
