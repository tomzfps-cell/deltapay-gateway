-- =============================================
-- 1) TABLA ORDERS - Pedidos de productos físicos
-- =============================================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  
  -- Snapshot del producto al momento de la compra
  product_snapshot_name TEXT NOT NULL,
  product_snapshot_amount NUMERIC(18,2) NOT NULL,
  product_snapshot_currency TEXT NOT NULL DEFAULT 'ARS',
  
  -- Costos
  shipping_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL,
  
  -- Datos del cliente
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- Datos de envío
  shipping_name TEXT NOT NULL,
  shipping_lastname TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_province TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  
  -- Estado del pedido
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending_payment', 'paid', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para orders
CREATE INDEX idx_orders_merchant_id ON public.orders(merchant_id);
CREATE INDEX idx_orders_product_id ON public.orders(product_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email);

-- Trigger para updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Merchants pueden ver sus pedidos
CREATE POLICY "Merchants can view own orders"
  ON public.orders FOR SELECT
  USING (user_belongs_to_merchant(auth.uid(), merchant_id) OR has_role(auth.uid(), 'admin'));

-- Sistema puede insertar orders (via RPC)
CREATE POLICY "System can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Sistema puede actualizar orders
CREATE POLICY "System can update orders"
  ON public.orders FOR UPDATE
  USING (true);

-- Público puede ver sus propios orders por ID (para checkout)
CREATE POLICY "Public can view order by id"
  ON public.orders FOR SELECT
  USING (true);

-- =============================================
-- 2) MODIFICAR TABLA PAYMENTS
-- =============================================
-- Añadir nuevas columnas a payments
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mercadopago',
  ADD COLUMN IF NOT EXISTS settlement_type TEXT DEFAULT 'standard' CHECK (settlement_type IN ('immediate', 'standard')),
  ADD COLUMN IF NOT EXISTS funds_status TEXT DEFAULT 'pending' CHECK (funds_status IN ('pending', 'available'));

-- Índice para order_id
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- =============================================
-- 3) TABLA MP_EVENTS - Auditoría de eventos MP
-- =============================================
CREATE TABLE public.mp_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  payment_id UUID REFERENCES public.payments(id),
  mp_payment_id TEXT,
  event_type TEXT NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mp_events
CREATE INDEX idx_mp_events_order_id ON public.mp_events(order_id);
CREATE INDEX idx_mp_events_payment_id ON public.mp_events(payment_id);
CREATE INDEX idx_mp_events_mp_payment_id ON public.mp_events(mp_payment_id);

-- RLS para mp_events
ALTER TABLE public.mp_events ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todos los eventos
CREATE POLICY "Admins can view mp_events"
  ON public.mp_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Merchants pueden ver eventos de sus orders
CREATE POLICY "Merchants can view own mp_events"
  ON public.mp_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = mp_events.order_id
    AND user_belongs_to_merchant(auth.uid(), o.merchant_id)
  ));

-- =============================================
-- 4) FUNCIÓN: Crear order desde product slug
-- =============================================
CREATE OR REPLACE FUNCTION public.create_order_from_product(
  _product_slug TEXT,
  _customer_email TEXT,
  _customer_phone TEXT,
  _shipping_name TEXT,
  _shipping_lastname TEXT,
  _shipping_address TEXT,
  _shipping_city TEXT,
  _shipping_province TEXT,
  _shipping_postal_code TEXT,
  _shipping_cost NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product RECORD;
  v_order_id UUID;
  v_payment_id UUID;
  v_idempotency_key TEXT;
  v_total_amount NUMERIC;
BEGIN
  -- Buscar producto activo
  SELECT p.*, m.id as merchant_id, m.business_name
  INTO v_product
  FROM public.products p
  JOIN public.merchants m ON m.id = p.merchant_id
  WHERE p.slug = _product_slug
    AND p.is_active = true
    AND m.is_active = true;

  IF v_product IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found or inactive');
  END IF;

  -- Calcular total
  v_total_amount := v_product.price + COALESCE(_shipping_cost, 0);

  -- Crear order
  INSERT INTO public.orders (
    merchant_id,
    product_id,
    product_snapshot_name,
    product_snapshot_amount,
    product_snapshot_currency,
    shipping_cost,
    total_amount,
    customer_email,
    customer_phone,
    shipping_name,
    shipping_lastname,
    shipping_address,
    shipping_city,
    shipping_province,
    shipping_postal_code,
    status
  ) VALUES (
    v_product.merchant_id,
    v_product.id,
    v_product.name,
    v_product.price,
    v_product.currency::text,
    COALESCE(_shipping_cost, 0),
    v_total_amount,
    _customer_email,
    _customer_phone,
    _shipping_name,
    _shipping_lastname,
    _shipping_address,
    _shipping_city,
    _shipping_province,
    _shipping_postal_code,
    'pending_payment'
  ) RETURNING id INTO v_order_id;

  -- Generar idempotency key única para este order
  v_idempotency_key := gen_random_uuid()::text;

  -- Crear payment vinculado al order
  INSERT INTO public.payments (
    merchant_id,
    order_id,
    amount_local,
    currency,
    status,
    provider,
    idempotency_key,
    expires_at,
    payment_method
  ) VALUES (
    v_product.merchant_id,
    v_order_id,
    v_total_amount,
    v_product.currency,
    'pending',
    'mercadopago',
    v_idempotency_key,
    now() + interval '2 hours',
    'qr'
  ) RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'payment_id', v_payment_id,
    'idempotency_key', v_idempotency_key,
    'total_amount', v_total_amount
  );
END;
$$;

-- =============================================
-- 5) FUNCIÓN: Obtener order para checkout público
-- =============================================
CREATE OR REPLACE FUNCTION public.get_order_for_checkout(_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_payment RECORD;
BEGIN
  -- Obtener order
  SELECT 
    o.*,
    m.business_name as merchant_name
  INTO v_order
  FROM public.orders o
  JOIN public.merchants m ON m.id = o.merchant_id
  WHERE o.id = _order_id;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Obtener payment asociado
  SELECT * INTO v_payment
  FROM public.payments
  WHERE order_id = _order_id
  ORDER BY created_at DESC
  LIMIT 1;

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
      'merchant_name', v_order.merchant_name,
      'created_at', v_order.created_at
    ),
    'payment', CASE WHEN v_payment IS NOT NULL THEN jsonb_build_object(
      'id', v_payment.id,
      'status', v_payment.status,
      'idempotency_key', v_payment.idempotency_key,
      'mp_preference_id', v_payment.mp_preference_id
    ) ELSE NULL END
  );
END;
$$;

-- =============================================
-- 6) FUNCIÓN: Actualizar datos de order (contacto/envío)
-- =============================================
CREATE OR REPLACE FUNCTION public.update_order_checkout_data(
  _order_id UUID,
  _customer_email TEXT DEFAULT NULL,
  _customer_phone TEXT DEFAULT NULL,
  _shipping_name TEXT DEFAULT NULL,
  _shipping_lastname TEXT DEFAULT NULL,
  _shipping_address TEXT DEFAULT NULL,
  _shipping_city TEXT DEFAULT NULL,
  _shipping_province TEXT DEFAULT NULL,
  _shipping_postal_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Verificar que el order existe y está en estado válido
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status NOT IN ('created', 'pending_payment') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be modified');
  END IF;

  -- Actualizar solo los campos proporcionados
  UPDATE public.orders SET
    customer_email = COALESCE(_customer_email, customer_email),
    customer_phone = COALESCE(_customer_phone, customer_phone),
    shipping_name = COALESCE(_shipping_name, shipping_name),
    shipping_lastname = COALESCE(_shipping_lastname, shipping_lastname),
    shipping_address = COALESCE(_shipping_address, shipping_address),
    shipping_city = COALESCE(_shipping_city, shipping_city),
    shipping_province = COALESCE(_shipping_province, shipping_province),
    shipping_postal_code = COALESCE(_shipping_postal_code, shipping_postal_code),
    updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id);
END;
$$;

-- =============================================
-- 7) FUNCIÓN: Confirmar pago de order (para webhook/backend)
-- =============================================
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  _order_id UUID,
  _mp_payment_id TEXT,
  _fx_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_payment RECORD;
  v_merchant RECORD;
  v_fx_snapshot_id UUID;
  v_amount_usdt_gross NUMERIC(18,8);
  v_fee_usdt NUMERIC(18,8);
  v_amount_usdt_net NUMERIC(18,8);
  v_current_balance NUMERIC(18,8);
  v_new_balance NUMERIC(18,8);
BEGIN
  -- Obtener order con lock
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Idempotencia: si ya está pagado, retornar éxito
  IF v_order.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', _order_id);
  END IF;

  -- Obtener payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE order_id = _order_id
  FOR UPDATE;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  -- Idempotencia: si payment ya confirmado
  IF v_payment.status = 'confirmed' THEN
    RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', _order_id);
  END IF;

  -- Obtener merchant
  SELECT * INTO v_merchant
  FROM public.merchants
  WHERE id = v_order.merchant_id;

  -- Crear FX snapshot
  INSERT INTO public.fx_snapshots (from_currency, rate, rate_inverse, source)
  VALUES ('ARS'::currency_code, _fx_rate, 1/_fx_rate, 'mp_webhook')
  RETURNING id INTO v_fx_snapshot_id;

  -- Calcular montos USDT
  v_amount_usdt_gross := v_order.total_amount * _fx_rate;
  v_fee_usdt := v_amount_usdt_gross * v_merchant.fee_percentage;
  v_amount_usdt_net := v_amount_usdt_gross - v_fee_usdt;

  -- Obtener balance actual
  SELECT COALESCE(
    (SELECT balance_after FROM public.ledger_entries 
     WHERE merchant_id = v_order.merchant_id 
     ORDER BY created_at DESC LIMIT 1), 
    0
  ) INTO v_current_balance;

  v_new_balance := v_current_balance + v_amount_usdt_net;

  -- Actualizar order
  UPDATE public.orders SET
    status = 'paid',
    updated_at = now()
  WHERE id = _order_id;

  -- Actualizar payment
  UPDATE public.payments SET
    status = 'confirmed',
    mp_preference_id = _mp_payment_id,
    fx_snapshot_id = v_fx_snapshot_id,
    amount_usdt_gross = v_amount_usdt_gross,
    fee_usdt = v_fee_usdt,
    amount_usdt_net = v_amount_usdt_net,
    confirmed_at = now(),
    funds_status = 'available',
    updated_at = now()
  WHERE id = v_payment.id;

  -- Crear entrada de ledger (crédito)
  INSERT INTO public.ledger_entries (
    merchant_id, payment_id, entry_type, amount_usdt, balance_after, description
  ) VALUES (
    v_order.merchant_id, v_payment.id, 'credit_payment', v_amount_usdt_net, v_new_balance,
    'Order payment: ' || _order_id::text
  );

  -- Crear entrada de ledger (fee)
  INSERT INTO public.ledger_entries (
    merchant_id, payment_id, entry_type, amount_usdt, balance_after, description
  ) VALUES (
    v_order.merchant_id, v_payment.id, 'debit_fee', -v_fee_usdt, v_new_balance,
    'Fee for order: ' || _order_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'payment_id', v_payment.id,
    'amount_usdt_gross', v_amount_usdt_gross,
    'fee_usdt', v_fee_usdt,
    'amount_usdt_net', v_amount_usdt_net,
    'new_balance', v_new_balance
  );
END;
$$;