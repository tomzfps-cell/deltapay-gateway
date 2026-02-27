
-- Update resolve_checkout_theme to include resolution source for debugging
CREATE OR REPLACE FUNCTION public.resolve_checkout_theme(
  p_product_id uuid,
  p_merchant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product RECORD;
  v_merchant RECORD;
  v_template RECORD;
  v_theme jsonb;
  v_hide_fields jsonb;
  v_source text := 'hardcoded';
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  SELECT * INTO v_merchant FROM public.merchants WHERE id = p_merchant_id;

  -- Priority 1: product-specific template
  IF v_product IS NOT NULL AND v_product.checkout_template_id IS NOT NULL THEN
    SELECT * INTO v_template FROM public.checkout_templates WHERE id = v_product.checkout_template_id;
    IF v_template IS NOT NULL THEN
      v_source := 'product';
    END IF;
  END IF;

  -- Priority 2: merchant default template
  IF v_template IS NULL THEN
    SELECT * INTO v_template FROM public.checkout_templates
    WHERE merchant_id = p_merchant_id AND is_default = true
    LIMIT 1;
    IF v_template IS NOT NULL THEN
      v_source := 'merchant_default';
    END IF;
  END IF;

  -- Build theme
  IF v_template IS NOT NULL THEN
    v_theme := jsonb_build_object(
      'brand_name', COALESCE(v_template.theme_tokens->>'brand_name', v_merchant.business_name),
      'logo_path', v_template.assets->>'logo_path',
      'hero_image_path', v_template.assets->>'hero_image_path',
      'primary_color', COALESCE(v_template.theme_tokens->>'primary_color', '#06B6D4'),
      'secondary_color', COALESCE(v_template.theme_tokens->>'secondary_color', '#0284C7'),
      'background_color', COALESCE(v_template.theme_tokens->>'background_color', '#FAFAFA'),
      'text_color', COALESCE(v_template.theme_tokens->>'text_color', '#111827'),
      'button_radius', COALESCE(v_template.theme_tokens->>'button_radius', 'md'),
      'font_family', COALESCE(v_template.theme_tokens->>'font_family', 'Inter'),
      'layout_style', COALESCE(v_template.layout_style, 'split'),
      'locale_default', COALESCE(v_template.locale, 'es'),
      'benefits', COALESCE(v_template.content_blocks->'benefits', '[]'::jsonb),
      'trust_badges', COALESCE(v_template.content_blocks->'trust_badges', '[]'::jsonb),
      'checkout_title', v_template.content_blocks->>'checkout_title'
    );
    v_hide_fields := COALESCE(v_template.fields_config->'hide_fields', '[]'::jsonb);
  ELSE
    v_theme := jsonb_build_object(
      'brand_name', COALESCE(v_merchant.business_name, 'DeltaPay'),
      'logo_path', null,
      'hero_image_path', null,
      'primary_color', '#06B6D4',
      'secondary_color', '#0284C7',
      'background_color', '#FAFAFA',
      'text_color', '#111827',
      'button_radius', 'md',
      'font_family', 'Inter',
      'layout_style', 'split',
      'locale_default', 'es',
      'benefits', '[]'::jsonb,
      'trust_badges', '[]'::jsonb,
      'checkout_title', null
    );
    v_hide_fields := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'theme', v_theme,
    'hide_fields', v_hide_fields,
    'template_id', CASE WHEN v_template IS NOT NULL THEN v_template.id ELSE null END,
    'resolution_source', v_source
  );
END;
$$;

-- Update get_product_landing_config to pass resolution_source through
CREATE OR REPLACE FUNCTION public.get_product_landing_config(_product_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product RECORD;
  v_merchant RECORD;
  v_resolved jsonb;
BEGIN
  SELECT * INTO v_product
  FROM public.products
  WHERE slug = _product_slug AND is_active = true;

  IF v_product IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found or inactive');
  END IF;

  SELECT * INTO v_merchant
  FROM public.merchants
  WHERE id = v_product.merchant_id AND is_active = true;

  IF v_merchant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Merchant not found or inactive');
  END IF;

  v_resolved := public.resolve_checkout_theme(v_product.id, v_product.merchant_id);

  RETURN jsonb_build_object(
    'success', true,
    'product', jsonb_build_object(
      'id', v_product.id,
      'name', v_product.name,
      'description', v_product.description,
      'price', v_product.price,
      'currency', v_product.currency,
      'image_url', v_product.image_url,
      'slug', v_product.slug
    ),
    'merchant', jsonb_build_object(
      'id', v_merchant.id,
      'name', v_merchant.business_name
    ),
    'theme', v_resolved->'theme',
    'hide_fields', v_resolved->'hide_fields',
    'template_id', v_resolved->'template_id',
    'resolution_source', v_resolved->'resolution_source'
  );
END;
$$;

-- Update get_checkout_config to pass resolution_source through
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
  v_payment RECORD;
  v_resolved jsonb;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = v_order.product_id;
  SELECT * INTO v_merchant FROM public.merchants WHERE id = v_order.merchant_id;
  SELECT * INTO v_payment FROM public.payments WHERE order_id = _order_id ORDER BY created_at DESC LIMIT 1;

  v_resolved := public.resolve_checkout_theme(v_order.product_id, v_order.merchant_id);

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
    'merchant', jsonb_build_object(
      'id', v_merchant.id,
      'name', v_merchant.business_name
    ),
    'theme', v_resolved->'theme',
    'hide_fields', v_resolved->'hide_fields',
    'overrides', null,
    'template_id', v_resolved->'template_id',
    'resolution_source', v_resolved->'resolution_source',
    'payment', CASE WHEN v_payment IS NOT NULL THEN jsonb_build_object(
      'id', v_payment.id,
      'status', v_payment.status,
      'idempotency_key', v_payment.idempotency_key,
      'mp_preference_id', v_payment.mp_preference_id
    ) ELSE null END
  );
END;
$$;
