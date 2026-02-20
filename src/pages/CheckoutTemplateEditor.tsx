import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Save, Loader2, Upload, Eye, EyeOff, Plus, X, Paintbrush,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckoutSplitLayout } from '@/components/checkout/CheckoutSplitLayout';
import { StepIndicator } from '@/components/checkout/StepIndicator';
import { ThemedButton } from '@/components/checkout/ThemedButton';
import { CheckoutTheme } from '@/hooks/useCheckoutConfig';

interface TemplateForm {
  name: string;
  locale: string;
  layout_style: string;
  theme_tokens: {
    primary_color: string;
    secondary_color: string;
    background_color: string;
    text_color: string;
    button_radius: string;
    font_family: string;
    brand_name: string;
  };
  fields_config: {
    hide_fields: string[];
  };
  content_blocks: {
    checkout_title: string;
    benefits: string[];
    trust_badges: string[];
  };
  assets: {
    logo_path: string | null;
    hero_image_path: string | null;
  };
  is_default: boolean;
}

const DEFAULT_FORM: TemplateForm = {
  name: 'Nuevo Template',
  locale: 'es',
  layout_style: 'split',
  theme_tokens: {
    primary_color: '#06B6D4',
    secondary_color: '#0284C7',
    background_color: '#FAFAFA',
    text_color: '#111827',
    button_radius: 'md',
    font_family: 'Inter',
    brand_name: '',
  },
  fields_config: { hide_fields: [] },
  content_blocks: { checkout_title: '', benefits: [], trust_badges: [] },
  assets: { logo_path: null, hero_image_path: null },
  is_default: false,
};

const HIDEABLE_FIELDS = [
  { key: 'phone', label: 'Teléfono' },
  { key: 'document', label: 'Documento (DNI/CUIT)' },
];

export const CheckoutTemplateEditor: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { merchant } = useAuth();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<TemplateForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(!!templateId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'hero' | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [newBenefit, setNewBenefit] = useState('');
  const [newBadge, setNewBadge] = useState('');

  const isNew = !templateId;

  useEffect(() => {
    if (!templateId || !merchant?.id) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('checkout_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !data) {
        toast({ title: 'Template no encontrado', variant: 'destructive' });
        navigate('/checkout-templates');
        return;
      }

      const d = data as any;
      setForm({
        name: d.name || '',
        locale: d.locale || 'es',
        layout_style: d.layout_style || 'split',
        theme_tokens: {
          primary_color: d.theme_tokens?.primary_color || '#06B6D4',
          secondary_color: d.theme_tokens?.secondary_color || '#0284C7',
          background_color: d.theme_tokens?.background_color || '#FAFAFA',
          text_color: d.theme_tokens?.text_color || '#111827',
          button_radius: d.theme_tokens?.button_radius || 'md',
          font_family: d.theme_tokens?.font_family || 'Inter',
          brand_name: d.theme_tokens?.brand_name || '',
        },
        fields_config: { hide_fields: d.fields_config?.hide_fields || [] },
        content_blocks: {
          checkout_title: d.content_blocks?.checkout_title || '',
          benefits: d.content_blocks?.benefits || [],
          trust_badges: d.content_blocks?.trust_badges || [],
        },
        assets: {
          logo_path: d.assets?.logo_path || null,
          hero_image_path: d.assets?.hero_image_path || null,
        },
        is_default: d.is_default || false,
      });
      setLoading(false);
    };
    load();
  }, [templateId, merchant?.id]);

  const handleUpload = async (file: File, type: 'logo' | 'hero') => {
    if (!merchant?.id) return;
    setUploading(type);
    const ext = file.name.split('.').pop();
    const path = `merchants/${merchant.id}/templates/${templateId || 'new'}/${type}.${ext}`;

    try {
      const { error } = await supabase.storage.from('merchant-assets').upload(path, file, { upsert: true });
      if (error) throw error;

      setForm(prev => ({
        ...prev,
        assets: { ...prev.assets, [type === 'logo' ? 'logo_path' : 'hero_image_path']: path },
      }));
      toast({ title: `${type === 'logo' ? 'Logo' : 'Imagen'} subido` });
    } catch (err: any) {
      toast({ title: 'Error al subir', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!merchant?.id) return;
    setSaving(true);

    const payload = {
      merchant_id: merchant.id,
      name: form.name,
      locale: form.locale,
      layout_style: form.layout_style,
      theme_tokens: form.theme_tokens,
      fields_config: form.fields_config,
      content_blocks: form.content_blocks,
      assets: form.assets,
    };

    try {
      if (isNew) {
        const { data, error } = await supabase
          .from('checkout_templates')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        toast({ title: 'Template creado' });
        navigate(`/checkout-templates/${(data as any).id}`, { replace: true });
      } else {
        const { error } = await supabase
          .from('checkout_templates')
          .update(payload)
          .eq('id', templateId);
        if (error) throw error;
        toast({ title: 'Template guardado' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleHideField = (field: string) => {
    setForm(prev => {
      const current = prev.fields_config.hide_fields;
      return {
        ...prev,
        fields_config: {
          hide_fields: current.includes(field)
            ? current.filter(f => f !== field)
            : [...current, field],
        },
      };
    });
  };

  const addBenefit = () => {
    if (!newBenefit.trim()) return;
    setForm(prev => ({
      ...prev,
      content_blocks: { ...prev.content_blocks, benefits: [...prev.content_blocks.benefits, newBenefit.trim()] },
    }));
    setNewBenefit('');
  };

  const removeBenefit = (i: number) => {
    setForm(prev => ({
      ...prev,
      content_blocks: { ...prev.content_blocks, benefits: prev.content_blocks.benefits.filter((_, idx) => idx !== i) },
    }));
  };

  const addBadge = () => {
    if (!newBadge.trim()) return;
    setForm(prev => ({
      ...prev,
      content_blocks: { ...prev.content_blocks, trust_badges: [...prev.content_blocks.trust_badges, newBadge.trim()] },
    }));
    setNewBadge('');
  };

  const removeBadge = (i: number) => {
    setForm(prev => ({
      ...prev,
      content_blocks: { ...prev.content_blocks, trust_badges: prev.content_blocks.trust_badges.filter((_, idx) => idx !== i) },
    }));
  };

  const updateToken = (key: string, value: string) => {
    setForm(prev => ({
      ...prev,
      theme_tokens: { ...prev.theme_tokens, [key]: value },
    }));
  };

  const logoUrl = form.assets.logo_path
    ? supabase.storage.from('merchant-assets').getPublicUrl(form.assets.logo_path).data.publicUrl
    : null;

  const heroUrl = form.assets.hero_image_path
    ? supabase.storage.from('merchant-assets').getPublicUrl(form.assets.hero_image_path).data.publicUrl
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Build preview theme
  const previewTheme: CheckoutTheme = {
    brand_name: form.theme_tokens.brand_name || merchant?.business_name || 'Mi Tienda',
    logo_path: form.assets.logo_path,
    primary_color: form.theme_tokens.primary_color,
    secondary_color: form.theme_tokens.secondary_color,
    background_color: form.theme_tokens.background_color,
    text_color: form.theme_tokens.text_color,
    button_radius: form.theme_tokens.button_radius as 'sm' | 'md' | 'lg',
    font_family: form.theme_tokens.font_family,
    layout_style: form.layout_style as 'split' | 'single',
    locale_default: form.locale,
    benefits: form.content_blocks.benefits,
    trust_badges: form.content_blocks.trust_badges,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/checkout-templates')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Paintbrush className="h-6 w-6 text-primary" />
              {isNew ? 'Nuevo Template' : form.name}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? 'Configurá tu plantilla de checkout' : 'Editá la plantilla de checkout'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Ocultar' : 'Preview'}
          </Button>
          <Button className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </div>

      <div className={showPreview ? 'grid lg:grid-cols-2 gap-6' : ''}>
        {/* Editor form */}
        <div className="space-y-6">
          {/* Name & basic */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">General</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre del template</Label>
                <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field" placeholder="Mi Template" />
              </div>
              <div className="space-y-2">
                <Label>Nombre de marca</Label>
                <Input value={form.theme_tokens.brand_name} onChange={e => updateToken('brand_name', e.target.value)}
                  className="input-field" placeholder={merchant?.business_name || 'Mi Tienda'} />
              </div>
            </div>
          </div>

          {/* Assets */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Assets</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 object-contain rounded" />}
                  <input type="file" ref={logoInputRef} accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo')} />
                  <Button variant="outline" size="sm" className="gap-2"
                    onClick={() => logoInputRef.current?.click()} disabled={uploading === 'logo'}>
                    {uploading === 'logo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {form.assets.logo_path ? 'Cambiar' : 'Subir logo'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Imagen hero (opcional)</Label>
                <div className="flex items-center gap-3">
                  {heroUrl && <img src={heroUrl} alt="Hero" className="h-10 object-contain rounded" />}
                  <input type="file" ref={heroInputRef} accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'hero')} />
                  <Button variant="outline" size="sm" className="gap-2"
                    onClick={() => heroInputRef.current?.click()} disabled={uploading === 'hero'}>
                    {uploading === 'hero' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {form.assets.hero_image_path ? 'Cambiar' : 'Subir imagen'}
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
                    <input type="color" value={(form.theme_tokens as any)[key]}
                      onChange={e => updateToken(key, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border" />
                    <Input value={(form.theme_tokens as any)[key]}
                      onChange={e => updateToken(key, e.target.value)}
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
                <Select value={form.layout_style} onValueChange={v => setForm(prev => ({ ...prev, layout_style: v }))}>
                  <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="split">Split (2 columnas)</SelectItem>
                    <SelectItem value="single">Single (1 columna)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipografía</Label>
                <Select value={form.theme_tokens.font_family} onValueChange={v => updateToken('font_family', v)}>
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
                <Select value={form.theme_tokens.button_radius} onValueChange={v => updateToken('button_radius', v)}>
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
              <Select value={form.locale} onValueChange={v => setForm(prev => ({ ...prev, locale: v }))}>
                <SelectTrigger className="input-field w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇦🇷 Español</SelectItem>
                  <SelectItem value="pt">🇧🇷 Português</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fields config */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Campos del formulario</h3>
            <p className="text-sm text-muted-foreground">Ocultá campos opcionales del checkout</p>
            <div className="space-y-3">
              {HIDEABLE_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {form.fields_config.hide_fields.includes(key) ? 'Oculto' : 'Visible'}
                    </span>
                    <Switch
                      checked={!form.fields_config.hide_fields.includes(key)}
                      onCheckedChange={() => toggleHideField(key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content blocks */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Contenido</h3>
            <div className="space-y-2">
              <Label>Título del checkout (opcional)</Label>
              <Input value={form.content_blocks.checkout_title}
                onChange={e => setForm(prev => ({
                  ...prev, content_blocks: { ...prev.content_blocks, checkout_title: e.target.value },
                }))}
                className="input-field" placeholder="Resumen del pedido" />
            </div>
          </div>

          {/* Benefits */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Beneficios (bullets)</h3>
            <div className="space-y-2">
              {form.content_blocks.benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm bg-muted/50 rounded px-3 py-1.5">{b}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeBenefit(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newBenefit} onChange={e => setNewBenefit(e.target.value)}
                  placeholder="Ej: Envío gratis a todo el país" className="input-field"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBenefit())} />
                <Button variant="outline" size="sm" onClick={addBenefit}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Trust badges</h3>
            <div className="space-y-2">
              {form.content_blocks.trust_badges.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm bg-muted/50 rounded px-3 py-1.5">{b}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeBadge(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newBadge} onChange={e => setNewBadge(e.target.value)}
                  placeholder="Ej: Pago seguro" className="input-field"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBadge())} />
                <Button variant="outline" size="sm" onClick={addBadge}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="border border-border rounded-xl overflow-hidden shadow-lg sticky top-8 h-fit">
            <div className="bg-muted/30 p-2 text-center text-xs text-muted-foreground border-b border-border">
              Vista previa del checkout
            </div>
            <div className="transform scale-[0.6] origin-top" style={{ height: '950px' }}>
              <CheckoutSplitLayout
                theme={previewTheme}
                logoUrl={logoUrl}
                heroImageUrl={heroUrl}
                checkoutTitle={form.content_blocks.checkout_title || 'Resumen del pedido'}
                productName="Producto de ejemplo"
                productDescription="Descripción del producto de ejemplo"
                productAmount={15000}
                shippingCost={0}
                totalAmount={15000}
                currency="ARS"
                benefits={form.content_blocks.benefits}
                trustBadges={form.content_blocks.trust_badges}
              >
                <StepIndicator currentStep="contact" primaryColor={form.theme_tokens.primary_color} />
                <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold" style={{ color: form.theme_tokens.text_color }}>
                    Datos de contacto
                  </h2>
                  <div className="space-y-3">
                    <Input placeholder="tu@email.com" className="bg-white border-gray-300" />
                    {!form.fields_config.hide_fields.includes('phone') && (
                      <Input placeholder="+54 9 11 1234-5678" className="bg-white border-gray-300" />
                    )}
                  </div>
                  <ThemedButton primaryColor={form.theme_tokens.primary_color}
                    buttonRadius={form.theme_tokens.button_radius as any} className="w-full">
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

export default CheckoutTemplateEditor;
