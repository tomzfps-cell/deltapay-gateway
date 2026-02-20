import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CheckoutTheme {
  brand_name: string;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  button_radius: 'sm' | 'md' | 'lg';
  font_family: string;
  layout_style: 'split' | 'single';
  locale_default: string;
  benefits: string[];
  trust_badges: string[];
}

export interface ProductOverrides {
  checkout_title: string | null;
  hero_image_path: string | null;
  primary_color_override: string | null;
  hide_fields: string[];
  custom_benefits: string[];
  trust_badges: string[];
}

export interface CheckoutOrderData {
  id: string;
  status: string;
  product_name: string;
  product_amount: number;
  product_currency: string;
  shipping_cost: number;
  total_amount: number;
  customer_email: string;
  customer_phone: string;
  shipping_name: string;
  shipping_lastname: string;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_postal_code: string;
  merchant_name: string;
  created_at: string;
}

export interface CheckoutProductData {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  currency: string;
}

export interface CheckoutPaymentData {
  id: string;
  status: string;
  idempotency_key: string;
  mp_preference_id: string | null;
}

export interface CheckoutConfig {
  order: CheckoutOrderData;
  product: CheckoutProductData;
  theme: CheckoutTheme;
  overrides: ProductOverrides | null;
  payment: CheckoutPaymentData | null;
}

const DEFAULT_THEME: CheckoutTheme = {
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
};

export function useCheckoutConfig(orderId: string | undefined) {
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateHideFields, setTemplateHideFields] = useState<string[]>([]);

  const loadConfig = useCallback(async (id: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_checkout_config', {
        _order_id: id,
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as {
        success: boolean;
        order?: CheckoutOrderData;
        product?: CheckoutProductData;
        theme?: CheckoutTheme;
        overrides?: ProductOverrides | null;
        payment?: CheckoutPaymentData | null;
        error?: string;
      };

      if (!result.success || !result.order) {
        setError(result.error || 'Pedido no encontrado');
        return;
      }

      // hide_fields now comes from the template via RPC
      const rpcHideFields = (result as any).hide_fields || [];

      setConfig({
        order: result.order,
        product: result.product!,
        theme: result.theme || DEFAULT_THEME,
        overrides: result.overrides || null,
        payment: result.payment || null,
      });

      // Store hide_fields from template
      setTemplateHideFields(rpcHideFields);
    } catch (err: any) {
      console.error('Error loading checkout config:', err);
      setError('Error al cargar la configuración del checkout');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orderId) {
      loadConfig(orderId);
    } else {
      setError('ID de pedido no válido');
      setLoading(false);
    }
  }, [orderId, loadConfig]);

  // Compute merged theme (theme + product overrides)
  const mergedTheme: CheckoutTheme | null = config
    ? {
        ...config.theme,
        primary_color: config.overrides?.primary_color_override || config.theme.primary_color,
        benefits: config.overrides?.custom_benefits?.length
          ? config.overrides.custom_benefits
          : config.theme.benefits,
        trust_badges: config.overrides?.trust_badges?.length
          ? config.overrides.trust_badges
          : config.theme.trust_badges,
      }
    : null;

  const logoUrl = config?.theme.logo_path
    ? supabase.storage.from('merchant-assets').getPublicUrl(config.theme.logo_path).data.publicUrl
    : null;

  const heroImageUrl = config?.overrides?.hero_image_path
    ? supabase.storage.from('merchant-assets').getPublicUrl(config.overrides.hero_image_path).data.publicUrl
    : config?.product.image_url || null;

  const checkoutTitle = config?.overrides?.checkout_title || config?.product.name || '';

  const hiddenFields = templateHideFields.length > 0
    ? templateHideFields
    : (config?.overrides?.hide_fields || []);

  return {
    config,
    mergedTheme,
    logoUrl,
    heroImageUrl,
    checkoutTitle,
    hiddenFields,
    loading,
    error,
    reload: () => orderId && loadConfig(orderId),
  };
}

/** Generate inline CSS variables from a theme */
export function themeToCSS(theme: CheckoutTheme): React.CSSProperties {
  const radiusMap = { sm: '0.375rem', md: '0.5rem', lg: '0.75rem' };
  return {
    '--checkout-primary': theme.primary_color,
    '--checkout-secondary': theme.secondary_color,
    '--checkout-bg': theme.background_color,
    '--checkout-text': theme.text_color,
    '--checkout-radius': radiusMap[theme.button_radius] || '0.5rem',
    fontFamily: `${theme.font_family}, system-ui, sans-serif`,
    backgroundColor: theme.background_color,
    color: theme.text_color,
  } as React.CSSProperties;
}
