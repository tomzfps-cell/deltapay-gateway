
-- =============================================
-- CHECKOUT TEMPLATES SYSTEM
-- =============================================

-- 1) Create checkout_templates table
CREATE TABLE public.checkout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  locale text NOT NULL DEFAULT 'es',
  layout_style text NOT NULL DEFAULT 'split',
  theme_tokens jsonb NOT NULL DEFAULT '{"primary_color":"#06B6D4","secondary_color":"#0284C7","background_color":"#FAFAFA","text_color":"#111827","button_radius":"md","font_family":"Inter","brand_name":null}'::jsonb,
  fields_config jsonb NOT NULL DEFAULT '{"hide_fields":[]}'::jsonb,
  content_blocks jsonb NOT NULL DEFAULT '{"checkout_title":null,"benefits":[],"trust_badges":[]}'::jsonb,
  assets jsonb NOT NULL DEFAULT '{"logo_path":null,"hero_image_path":null}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Enable RLS
ALTER TABLE public.checkout_templates ENABLE ROW LEVEL SECURITY;

-- 3) RLS Policies
CREATE POLICY "Merchants can manage own templates"
  ON public.checkout_templates
  FOR ALL
  USING (user_belongs_to_merchant(auth.uid(), merchant_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read templates"
  ON public.checkout_templates
  FOR SELECT
  USING (true);

-- 4) Trigger for updated_at
CREATE TRIGGER update_checkout_templates_updated_at
  BEFORE UPDATE ON public.checkout_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Unique partial index: only one default per merchant
CREATE UNIQUE INDEX idx_checkout_templates_one_default_per_merchant
  ON public.checkout_templates (merchant_id)
  WHERE is_default = true;

-- 6) Add checkout_template_id FK to products
ALTER TABLE public.products
  ADD COLUMN checkout_template_id uuid REFERENCES public.checkout_templates(id) ON DELETE SET NULL;

-- 7) Migrate existing merchant_checkout_themes into checkout_templates
INSERT INTO public.checkout_templates (
  merchant_id, name, locale, layout_style, theme_tokens, content_blocks, assets, is_default
)
SELECT
  mct.merchant_id,
  COALESCE(mct.brand_name, m.business_name, 'Default'),
  COALESCE(mct.locale_default, 'es'),
  COALESCE(mct.layout_style, 'split'),
  jsonb_build_object(
    'primary_color', COALESCE(mct.primary_color, '#06B6D4'),
    'secondary_color', COALESCE(mct.secondary_color, '#0284C7'),
    'background_color', COALESCE(mct.background_color, '#FAFAFA'),
    'text_color', COALESCE(mct.text_color, '#111827'),
    'button_radius', COALESCE(mct.button_radius, 'md'),
    'font_family', COALESCE(mct.font_family, 'Inter'),
    'brand_name', mct.brand_name
  ),
  jsonb_build_object(
    'checkout_title', null,
    'benefits', COALESCE(mct.benefits_json, '[]'::jsonb),
    'trust_badges', COALESCE(mct.trust_badges_json, '[]'::jsonb)
  ),
  jsonb_build_object(
    'logo_path', mct.logo_path,
    'hero_image_path', null
  ),
  true
FROM public.merchant_checkout_themes mct
JOIN public.merchants m ON m.id = mct.merchant_id;

-- 8) Update get_checkout_config to resolve template instead of theme+overrides
CREATE OR REPLACE FUNCTION public.get_checkout_config(_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_product RECORD;
  v_merchant RECORD;
  v_template RECORD;
  v_payment RECORD;
  v_theme_json jsonb;
  v_hide_fields jsonb;
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

  -- Resolve template: product-specific > merchant default > hardcoded default
  IF v_product.checkout_template_id IS NOT NULL THEN
    SELECT * INTO v_template FROM public.checkout_templates WHERE id = v_product.checkout_template_id;
  END IF;

  IF v_template IS NULL THEN
    SELECT * INTO v_template FROM public.checkout_templates
    WHERE merchant_id = v_order.merchant_id AND is_default = true
    LIMIT 1;
  END IF;

  -- Get latest payment
  SELECT * INTO v_payment FROM public.payments WHERE order_id = _order_id ORDER BY created_at DESC LIMIT 1;

  -- Build theme JSON from template or defaults
  IF v_template IS NOT NULL THEN
    v_theme_json := jsonb_build_object(
      'brand_name', COALESCE(v_template.theme_tokens->>'brand_name', v_merchant.business_name),
      'logo_path', v_template.assets->>'logo_path',
      'primary_color', COALESCE(v_template.theme_tokens->>'primary_color', '#06B6D4'),
      'secondary_color', COALESCE(v_template.theme_tokens->>'secondary_color', '#0284C7'),
      'background_color', COALESCE(v_template.theme_tokens->>'background_color', '#FAFAFA'),
      'text_color', COALESCE(v_template.theme_tokens->>'text_color', '#111827'),
      'button_radius', COALESCE(v_template.theme_tokens->>'button_radius', 'md'),
      'font_family', COALESCE(v_template.theme_tokens->>'font_family', 'Inter'),
      'layout_style', COALESCE(v_template.layout_style, 'split'),
      'locale_default', COALESCE(v_template.locale, 'es'),
      'benefits', COALESCE(v_template.content_blocks->'benefits', '[]'::jsonb),
      'trust_badges', COALESCE(v_template.content_blocks->'trust_badges', '[]'::jsonb)
    );
    v_hide_fields := COALESCE(v_template.fields_config->'hide_fields', '[]'::jsonb);
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
    v_hide_fields := '[]'::jsonb;
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
    'hide_fields', v_hide_fields,
    'overrides', null,
    'template_id', CASE WHEN v_template IS NOT NULL THEN v_template.id ELSE null END,
    'payment', CASE WHEN v_payment IS NOT NULL THEN jsonb_build_object(
      'id', v_payment.id,
      'status', v_payment.status,
      'idempotency_key', v_payment.idempotency_key,
      'mp_preference_id', v_payment.mp_preference_id
    ) ELSE null END
  );
END;
$function$;
