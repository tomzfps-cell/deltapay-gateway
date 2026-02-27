import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckoutTheme, themeToCSS } from '@/hooks/useCheckoutConfig';

export interface ProductLandingData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  slug: string;
}

export interface ProductLandingConfig {
  product: ProductLandingData;
  merchantName: string;
  theme: CheckoutTheme;
  hideFields: string[];
  templateId: string | null;
}

export function useProductLandingConfig(slug: string | undefined) {
  const [config, setConfig] = useState<ProductLandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMeta, setDebugMeta] = useState<{
    templateId: string | null;
    resolutionSource: string | null;
    merchantId: string | null;
    productId: string | null;
  }>({ templateId: null, resolutionSource: null, merchantId: null, productId: null });

  const loadConfig = useCallback(async (productSlug: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_product_landing_config', {
        _product_slug: productSlug,
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as {
        success: boolean;
        product?: ProductLandingData;
        merchant?: { id: string; name: string };
        theme?: CheckoutTheme;
        hide_fields?: string[];
        template_id?: string | null;
        resolution_source?: string | null;
        error?: string;
      };

      if (!result.success || !result.product) {
        setError(result.error || 'Producto no encontrado');
        return;
      }

      setConfig({
        product: result.product,
        merchantName: result.merchant?.name || 'DeltaPay',
        theme: result.theme || {
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
        },
        hideFields: result.hide_fields || [],
        templateId: result.template_id || null,
      });

      setDebugMeta({
        templateId: result.template_id || null,
        resolutionSource: result.resolution_source || null,
        merchantId: result.merchant?.id || null,
        productId: result.product?.id || null,
      });
    } catch (err: any) {
      console.error('Error loading product landing config:', err);
      setError('Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (slug) {
      loadConfig(slug);
    } else {
      setError('Producto no válido');
      setLoading(false);
    }
  }, [slug, loadConfig]);

  const logoUrl = config?.theme.logo_path
    ? supabase.storage.from('merchant-assets').getPublicUrl(config.theme.logo_path).data.publicUrl
    : null;

  const heroImageUrl = (config?.theme as any)?.hero_image_path
    ? supabase.storage.from('merchant-assets').getPublicUrl((config.theme as any).hero_image_path).data.publicUrl
    : config?.product.image_url || null;

  return {
    config,
    theme: config?.theme || null,
    logoUrl,
    heroImageUrl,
    debugMeta,
    loading,
    error,
  };
}
