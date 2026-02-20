import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, AlertTriangle } from 'lucide-react';
import { CheckoutSplitLayout } from '@/components/checkout/CheckoutSplitLayout';
import { StepIndicator } from '@/components/checkout/StepIndicator';
import { ThemedButton } from '@/components/checkout/ThemedButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckoutTheme } from '@/hooks/useCheckoutConfig';

export const CheckoutPreview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product_id');
  const templateId = searchParams.get('template_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<CheckoutTheme | null>(null);
  const [product, setProduct] = useState<{ name: string; description: string | null; price: number; currency: string; image_url: string | null } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        let template: any = null;

        // Load template
        if (templateId) {
          const { data } = await supabase
            .from('checkout_templates')
            .select('*')
            .eq('id', templateId)
            .single();
          template = data;
        } else if (productId) {
          // Get product's template or merchant default
          const { data: prod } = await supabase
            .from('products')
            .select('*, merchants!products_merchant_id_fkey(business_name)')
            .eq('id', productId)
            .single();

          if (prod) {
            setProduct({
              name: prod.name,
              description: prod.description,
              price: prod.price,
              currency: prod.currency,
              image_url: prod.image_url,
            });

            if ((prod as any).checkout_template_id) {
              const { data: t } = await supabase
                .from('checkout_templates')
                .select('*')
                .eq('id', (prod as any).checkout_template_id)
                .single();
              template = t;
            } else {
              const { data: t } = await supabase
                .from('checkout_templates')
                .select('*')
                .eq('merchant_id', prod.merchant_id)
                .eq('is_default', true)
                .single();
              template = t;
            }
          }
        }

        if (!template && !productId) {
          setError('Falta product_id o template_id');
          setLoading(false);
          return;
        }

        // Build theme from template
        if (template) {
          const t: CheckoutTheme = {
            brand_name: template.theme_tokens?.brand_name || 'Mi Tienda',
            logo_path: template.assets?.logo_path || null,
            primary_color: template.theme_tokens?.primary_color || '#06B6D4',
            secondary_color: template.theme_tokens?.secondary_color || '#0284C7',
            background_color: template.theme_tokens?.background_color || '#FAFAFA',
            text_color: template.theme_tokens?.text_color || '#111827',
            button_radius: (template.theme_tokens?.button_radius || 'md') as 'sm' | 'md' | 'lg',
            font_family: template.theme_tokens?.font_family || 'Inter',
            layout_style: (template.layout_style || 'split') as 'split' | 'single',
            locale_default: template.locale || 'es',
            benefits: template.content_blocks?.benefits || [],
            trust_badges: template.content_blocks?.trust_badges || [],
          };
          setTheme(t);

          if (t.logo_path) {
            setLogoUrl(supabase.storage.from('merchant-assets').getPublicUrl(t.logo_path).data.publicUrl);
          }
          if (template.assets?.hero_image_path) {
            setHeroUrl(supabase.storage.from('merchant-assets').getPublicUrl(template.assets.hero_image_path).data.publicUrl);
          }
        } else {
          // Fallback default theme
          setTheme({
            brand_name: 'DeltaPay',
            logo_path: null,
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
          });
        }

        // Default product if not loaded
        if (!product && !productId) {
          setProduct({ name: 'Producto de ejemplo', description: 'Descripción de ejemplo', price: 15000, currency: 'ARS', image_url: null });
        }
      } catch (err) {
        setError('Error al cargar la configuración');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, templateId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !theme) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-sm border border-gray-200">
          <Package className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-gray-500">{error || 'No se pudo cargar el preview'}</p>
        </div>
      </div>
    );
  }

  const p = product || { name: 'Producto de ejemplo', description: 'Descripción', price: 15000, currency: 'ARS', image_url: null };

  return (
    <div className="relative">
      {/* Preview banner */}
      <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2 sticky top-0 z-50">
        <AlertTriangle className="h-4 w-4" />
        MODO PREVIEW — Este checkout no crea pagos reales
      </div>

      <CheckoutSplitLayout
        theme={theme}
        logoUrl={logoUrl}
        heroImageUrl={heroUrl || p.image_url}
        checkoutTitle={p.name}
        productName={p.name}
        productDescription={p.description}
        productAmount={p.price}
        shippingCost={0}
        totalAmount={p.price}
        currency={p.currency}
        benefits={theme.benefits}
        trustBadges={theme.trust_badges}
      >
        <StepIndicator currentStep="contact" primaryColor={theme.primary_color} />
        <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold" style={{ color: theme.text_color }}>Datos de contacto</h2>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input placeholder="tu@email.com" className="bg-white border-gray-300" disabled />
            </div>
            <div className="space-y-2">
              <Label>Teléfono *</Label>
              <Input placeholder="+54 9 11 1234-5678" className="bg-white border-gray-300" disabled />
            </div>
          </div>
          <ThemedButton primaryColor={theme.primary_color} buttonRadius={theme.button_radius} className="w-full" disabled>
            Continuar a envío (preview)
          </ThemedButton>
        </div>
      </CheckoutSplitLayout>
    </div>
  );
};

export default CheckoutPreview;
