-- Actualizar la función get_public_payment_view para incluir mp_preference_id
CREATE OR REPLACE FUNCTION public.get_public_payment_view(_payment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment RECORD;
BEGIN
  SELECT 
    p.id,
    p.status,
    p.expires_at,
    p.payment_reference,
    p.snapshot_price,
    p.snapshot_currency,
    p.snapshot_redirect_url,
    p.customer_email,
    p.customer_name,
    p.confirmed_at,
    p.mp_preference_id,
    p.product_id,
    pr.name as product_name,
    pr.description as product_description,
    m.business_name as merchant_name
  INTO v_payment
  FROM public.payments p
  LEFT JOIN public.products pr ON pr.id = p.product_id
  LEFT JOIN public.merchants m ON m.id = p.merchant_id
  WHERE p.id = _payment_id;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment', jsonb_build_object(
      'id', v_payment.id,
      'status', v_payment.status,
      'expires_at', v_payment.expires_at,
      'payment_reference', v_payment.payment_reference,
      'amount', v_payment.snapshot_price,
      'currency', v_payment.snapshot_currency,
      'redirect_url', v_payment.snapshot_redirect_url,
      'confirmed_at', v_payment.confirmed_at,
      'mp_preference_id', v_payment.mp_preference_id,
      'product', jsonb_build_object(
        'name', v_payment.product_name,
        'description', v_payment.product_description
      ),
      'merchant', jsonb_build_object(
        'name', v_payment.merchant_name
      ),
      'customer', jsonb_build_object(
        'email', v_payment.customer_email,
        'name', v_payment.customer_name
      )
    )
  );
END;
$function$;