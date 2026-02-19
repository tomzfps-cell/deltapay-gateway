
-- =============================================
-- 1. Tabla: merchant_checkout_themes
-- =============================================
CREATE TABLE public.merchant_checkout_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  brand_name text,
  logo_path text,
  primary_color text DEFAULT '#06B6D4',
  secondary_color text DEFAULT '#0284C7',
  background_color text DEFAULT '#FAFAFA',
  text_color text DEFAULT '#111827',
  button_radius text DEFAULT 'md' CHECK (button_radius IN ('sm', 'md', 'lg')),
  font_family text DEFAULT 'Inter' CHECK (font_family IN ('Inter', 'Poppins', 'DM Sans')),
  layout_style text DEFAULT 'split' CHECK (layout_style IN ('split', 'single')),
  locale_default text DEFAULT 'es' CHECK (locale_default IN ('es', 'pt', 'en')),
  benefits_json jsonb DEFAULT '[]'::jsonb,
  trust_badges_json jsonb DEFAULT '[]'::jsonb,
  custom_css text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_checkout_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own checkout theme"
  ON public.merchant_checkout_themes FOR SELECT
  USING (user_belongs_to_merchant(auth.uid(), merchant_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can insert own checkout theme"
  ON public.merchant_checkout_themes FOR INSERT
  WITH CHECK (user_belongs_to_merchant(auth.uid(), merchant_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can update own checkout theme"
  ON public.merchant_checkout_themes FOR UPDATE
  USING (user_belongs_to_merchant(auth.uid(), merchant_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read checkout themes"
  ON public.merchant_checkout_themes FOR SELECT
  USING (true);

CREATE TRIGGER update_merchant_checkout_themes_updated_at
  BEFORE UPDATE ON public.merchant_checkout_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. Tabla: product_checkout_overrides
-- =============================================
CREATE TABLE public.product_checkout_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  checkout_title text,
  hero_image_path text,
  primary_color_override text,
  hide_fields jsonb DEFAULT '[]'::jsonb,
  custom_benefits jsonb DEFAULT '[]'::jsonb,
  trust_badges jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_checkout_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can manage own product overrides"
  ON public.product_checkout_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_checkout_overrides.product_id
      AND user_belongs_to_merchant(auth.uid(), p.merchant_id)
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Public can read product overrides"
  ON public.product_checkout_overrides FOR SELECT
  USING (true);

CREATE TRIGGER update_product_checkout_overrides_updated_at
  BEFORE UPDATE ON public.product_checkout_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. Storage bucket: merchant-assets
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-assets', 'merchant-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Merchants can upload own assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'merchant-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Merchants can update own assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'merchant-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Public can view merchant assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'merchant-assets');

-- =============================================
-- 4. RPC: get_checkout_config
-- =============================================
CREATE OR REPLACE FUNCTION public.get_checkout_config(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_product RECORD;
  v_merchant RECORD;
  v_theme RECORD;
  v_overrides RECORD;
  v_payment RECORD;
  v_theme_json jsonb;
  v_overrides_json jsonb;
BEGIN
  -- Get order
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Get product
  SELECT * INTO v_product FROM public.products WHERE id = v_order.product_id;

  -- Get merchant
  SELECT * INTO v_merchant FROM public.merchants WHERE id = v_order.merchant_id;

  -- Get theme (nullable)
  SELECT * INTO v_theme FROM public.merchant_checkout_themes WHERE merchant_id = v_order.merchant_id;

  -- Get product overrides (nullable)
  SELECT * INTO v_overrides FROM public.product_checkout_overrides WHERE product_id = v_order.product_id;

  -- Get latest payment
  SELECT * INTO v_payment FROM public.payments WHERE order_id = _order_id ORDER BY created_at DESC LIMIT 1;

  -- Build theme JSON
  IF v_theme IS NOT NULL THEN
    v_theme_json := jsonb_build_object(
      'brand_name', COALESCE(v_theme.brand_name, v_merchant.business_name),
      'logo_path', v_theme.logo_path,
      'primary_color', v_theme.primary_color,
      'secondary_color', v_theme.secondary_color,
      'background_color', v_theme.background_color,
      'text_color', v_theme.text_color,
      'button_radius', v_theme.button_radius,
      'font_family', v_theme.font_family,
      'layout_style', v_theme.layout_style,
      'locale_default', v_theme.locale_default,
      'benefits', v_theme.benefits_json,
      'trust_badges', v_theme.trust_badges_json
    );
  ELSE
    v_theme_json := jsonb_build_object(
      'brand_name', v_merchant.business_name,
      'logo_path', null,
      'primary_color', '#06B6D4',
      'secondary_color', '#0284C7',
      'background_color', '#FAFAFA',
      'text_color', '#111827',
      'button_radius', 'md',
      'font_family', 'Inter',
      'layout_style', 'split',
      'locale_default', 'es',
      'benefits', '[]'::jsonb,
      'trust_badges', '[]'::jsonb
    );
  END IF;

  -- Build overrides JSON
  IF v_overrides IS NOT NULL THEN
    v_overrides_json := jsonb_build_object(
      'checkout_title', v_overrides.checkout_title,
      'hero_image_path', v_overrides.hero_image_path,
      'primary_color_override', v_overrides.primary_color_override,
      'hide_fields', v_overrides.hide_fields,
      'custom_benefits', v_overrides.custom_benefits,
      'trust_badges', v_overrides.trust_badges
    );
  ELSE
    v_overrides_json := null;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'status', v_order.status,
      'product_name', v_order.product_snapshot_name,
      'product_amount', v_order.product_snapshot_amount,
      'product_currency', v_order.product_snapshot_currency,
      'shipping_cost', v_order.shipping_cost,
      'total_amount', v_order.total_amount,
      'customer_email', v_order.customer_email,
      'customer_phone', v_order.customer_phone,
      'shipping_name', v_order.shipping_name,
      'shipping_lastname', v_order.shipping_lastname,
      'shipping_address', v_order.shipping_address,
      'shipping_city', v_order.shipping_city,
      'shipping_province', v_order.shipping_province,
      'shipping_postal_code', v_order.shipping_postal_code,
      'merchant_name', v_merchant.business_name,
      'created_at', v_order.created_at
    ),
    'product', jsonb_build_object(
      'id', v_product.id,
      'name', v_product.name,
      'description', v_product.description,
      'image_url', v_product.image_url,
      'price', v_product.price,
      'currency', v_product.currency
    ),
    'theme', v_theme_json,
    'overrides', v_overrides_json,
    'payment', CASE WHEN v_payment IS NOT NULL THEN jsonb_build_object(
      'id', v_payment.id,
      'status', v_payment.status,
      'idempotency_key', v_payment.idempotency_key,
      'mp_preference_id', v_payment.mp_preference_id
    ) ELSE null END
  );
END;
$$;
