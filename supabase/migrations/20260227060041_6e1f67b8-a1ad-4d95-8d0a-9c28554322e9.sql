CREATE OR REPLACE FUNCTION public.resolve_checkout_theme(p_product_id uuid, p_merchant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Priority 1: product-specific template (by products.checkout_template_id)
  IF v_product.id IS NOT NULL AND v_product.checkout_template_id IS NOT NULL THEN
    SELECT * INTO v_template FROM public.checkout_templates WHERE id = v_product.checkout_template_id;
    IF v_template.id IS NOT NULL THEN
      v_source := 'product';
    END IF;
  END IF;

  -- Priority 2: merchant default template (only if no product template was found)
  IF v_template.id IS NULL THEN
    SELECT * INTO v_template FROM public.checkout_templates
    WHERE merchant_id = p_merchant_id AND is_default = true
    LIMIT 1;
    IF v_template.id IS NOT NULL THEN
      v_source := 'merchant_default';
    END IF;
  END IF;

  -- Build theme
  IF v_template.id IS NOT NULL THEN
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
    'template_id', CASE WHEN v_template.id IS NOT NULL THEN v_template.id ELSE null END,
    'resolution_source', v_source
  );
END;
$function$;