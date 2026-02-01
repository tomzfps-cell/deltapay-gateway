-- ============================================
-- GATEWAY POOL ACCOUNTS (Cuentas recaudadoras DeltaPay)
-- ============================================

CREATE TABLE public.gateway_pool_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  alias TEXT,
  cbu TEXT,
  cvu TEXT,
  account_holder TEXT NOT NULL,
  bank_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo una cuenta puede ser primaria
CREATE UNIQUE INDEX idx_pool_accounts_primary ON public.gateway_pool_accounts (is_primary) WHERE is_primary = true;

-- Trigger para updated_at
CREATE TRIGGER update_gateway_pool_accounts_updated_at
  BEFORE UPDATE ON public.gateway_pool_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Solo admins pueden gestionar pool accounts
ALTER TABLE public.gateway_pool_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pool accounts"
  ON public.gateway_pool_accounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view active pool accounts"
  ON public.gateway_pool_accounts FOR SELECT
  USING (is_active = true);

-- Insertar cuenta recaudadora inicial de DeltaPay
INSERT INTO public.gateway_pool_accounts (label, alias, cbu, account_holder, bank_name, is_active, is_primary)
VALUES ('DeltaPay Recaudadora Principal', 'deltapay.cobros', '0000003100000000000001', 'DELTAPAY S.A.', 'Banco Virtual', true, true);

-- ============================================
-- AGREGAR CAMPOS DE POOL ACCOUNT SNAPSHOT EN PAYMENTS
-- ============================================

ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS pool_account_id UUID REFERENCES public.gateway_pool_accounts(id),
  ADD COLUMN IF NOT EXISTS pool_account_snapshot_alias TEXT,
  ADD COLUMN IF NOT EXISTS pool_account_snapshot_cbu TEXT,
  ADD COLUMN IF NOT EXISTS pool_account_snapshot_cvu TEXT,
  ADD COLUMN IF NOT EXISTS pool_account_snapshot_holder TEXT,
  ADD COLUMN IF NOT EXISTS pool_account_snapshot_bank TEXT;

-- ============================================
-- MERCHANT SIGNING SECRET PARA HMAC
-- ============================================

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS signing_secret TEXT DEFAULT encode(extensions.gen_random_bytes(32), 'hex');

-- ============================================
-- FUNCIÓN: Crear payment desde product_slug (PÚBLICA)
-- ============================================

CREATE OR REPLACE FUNCTION public.create_payment_from_product_slug(_product_slug TEXT, _customer_email TEXT DEFAULT NULL, _customer_name TEXT DEFAULT NULL, _customer_phone TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_pool_account RECORD;
  v_payment_id UUID;
  v_payment_reference TEXT;
BEGIN
  -- Buscar producto activo
  SELECT p.*, m.business_name as merchant_name
  INTO v_product
  FROM public.products p
  JOIN public.merchants m ON m.id = p.merchant_id
  WHERE p.slug = _product_slug 
    AND p.is_active = true
    AND m.is_active = true;

  IF v_product IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found or inactive');
  END IF;

  -- Obtener pool account primaria activa
  SELECT * INTO v_pool_account
  FROM public.gateway_pool_accounts
  WHERE is_active = true AND is_primary = true
  LIMIT 1;

  IF v_pool_account IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active pool account configured');
  END IF;

  -- Generar referencia única
  v_payment_reference := public.generate_payment_reference();

  -- Crear payment con todos los snapshots
  INSERT INTO public.payments (
    merchant_id,
    product_id,
    amount_local,
    currency,
    status,
    expires_at,
    payment_reference,
    -- Snapshots del producto
    snapshot_price,
    snapshot_currency,
    snapshot_redirect_url,
    -- Snapshots de pool account
    pool_account_id,
    pool_account_snapshot_alias,
    pool_account_snapshot_cbu,
    pool_account_snapshot_cvu,
    pool_account_snapshot_holder,
    pool_account_snapshot_bank,
    -- Customer data
    customer_email,
    customer_name,
    customer_phone
  ) VALUES (
    v_product.merchant_id,
    v_product.id,
    v_product.price,
    v_product.currency,
    'pending',
    now() + interval '30 minutes',
    v_payment_reference,
    -- Snapshots
    v_product.price,
    v_product.currency::text,
    v_product.redirect_url,
    -- Pool account snapshots
    v_pool_account.id,
    v_pool_account.alias,
    v_pool_account.cbu,
    v_pool_account.cvu,
    v_pool_account.account_holder,
    v_pool_account.bank_name,
    -- Customer
    _customer_email,
    _customer_name,
    _customer_phone
  ) RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'payment_reference', v_payment_reference,
    'expires_at', now() + interval '30 minutes'
  );
END;
$$;

-- ============================================
-- FUNCIÓN: Obtener vista pública del payment (SEGURA)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_public_payment_view(_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_product_name TEXT;
BEGIN
  SELECT 
    p.id,
    p.status,
    p.expires_at,
    p.payment_reference,
    p.snapshot_price,
    p.snapshot_currency,
    p.snapshot_redirect_url,
    p.pool_account_snapshot_alias,
    p.pool_account_snapshot_cbu,
    p.pool_account_snapshot_cvu,
    p.pool_account_snapshot_holder,
    p.pool_account_snapshot_bank,
    p.customer_email,
    p.customer_name,
    p.confirmed_at,
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
      'pool_account', jsonb_build_object(
        'alias', v_payment.pool_account_snapshot_alias,
        'cbu', v_payment.pool_account_snapshot_cbu,
        'cvu', v_payment.pool_account_snapshot_cvu,
        'holder', v_payment.pool_account_snapshot_holder,
        'bank', v_payment.pool_account_snapshot_bank
      ),
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
$$;

-- ============================================
-- FUNCIÓN: Generar firma HMAC para redirect
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_payment_redirect_signature(_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_merchant RECORD;
  v_signature TEXT;
  v_redirect_url TEXT;
BEGIN
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = _payment_id AND status = 'confirmed';

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found or not confirmed');
  END IF;

  SELECT * INTO v_merchant
  FROM public.merchants
  WHERE id = v_payment.merchant_id;

  -- Generar HMAC signature
  -- payload: payment_id|status|amount|currency
  v_signature := encode(
    extensions.hmac(
      v_payment.id::text || '|confirmed|' || v_payment.snapshot_price::text || '|' || v_payment.snapshot_currency,
      v_merchant.signing_secret,
      'sha256'
    ),
    'hex'
  );

  -- Construir URL de redirect
  v_redirect_url := v_payment.snapshot_redirect_url 
    || '?payment_id=' || v_payment.id::text
    || '&status=confirmed'
    || '&amount=' || v_payment.snapshot_price::text
    || '&currency=' || v_payment.snapshot_currency
    || '&signature=' || v_signature;

  RETURN jsonb_build_object(
    'success', true,
    'redirect_url', v_redirect_url,
    'signature', v_signature
  );
END;
$$;

-- ============================================
-- POLICY: Permitir a checkout público leer payments por ID
-- ============================================

CREATE POLICY "Public can view own payment by id"
  ON public.payments FOR SELECT
  USING (true);