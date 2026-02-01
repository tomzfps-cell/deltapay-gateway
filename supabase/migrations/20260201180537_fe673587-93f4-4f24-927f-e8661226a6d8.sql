-- Add allowed_domains to merchants for open redirect prevention
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS allowed_domains text[] DEFAULT '{}';

-- Add product_slug unique constraint (per merchant)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_merchant_slug ON public.products(merchant_id, slug);

-- Add payment_reference for checkout display
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_reference text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(payment_reference);

-- Add snapshot fields to payments for immutable checkout data
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS snapshot_price numeric,
  ADD COLUMN IF NOT EXISTS snapshot_currency text,
  ADD COLUMN IF NOT EXISTS snapshot_redirect_url text;

-- Create push_subscriptions table for Web Push notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_subscriptions
CREATE POLICY "Users can manage own subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (user_id = auth.uid());

-- Create merchant_settings table for preferences
CREATE TABLE IF NOT EXISTS public.merchant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE UNIQUE,
  locale text NOT NULL DEFAULT 'es',
  display_currency text NOT NULL DEFAULT 'ARS',
  timezone text NOT NULL DEFAULT 'America/Buenos_Aires',
  checkout_instructions text,
  push_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on merchant_settings
ALTER TABLE public.merchant_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for merchant_settings
CREATE POLICY "Merchants can view own settings"
  ON public.merchant_settings FOR SELECT
  USING (user_belongs_to_merchant(auth.uid(), merchant_id));

CREATE POLICY "Merchants can update own settings"
  ON public.merchant_settings FOR UPDATE
  USING (user_belongs_to_merchant(auth.uid(), merchant_id));

CREATE POLICY "Merchants can insert own settings"
  ON public.merchant_settings FOR INSERT
  WITH CHECK (user_belongs_to_merchant(auth.uid(), merchant_id));

-- Function to generate unique payment reference
CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN 'DP-' || result;
END;
$$;

-- Trigger to auto-generate payment_reference
CREATE OR REPLACE FUNCTION public.set_payment_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_reference IS NULL THEN
    NEW.payment_reference := generate_payment_reference();
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.payments WHERE payment_reference = NEW.payment_reference AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      NEW.payment_reference := generate_payment_reference();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_payment_reference ON public.payments;
CREATE TRIGGER trigger_set_payment_reference
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION set_payment_reference();

-- Update updated_at trigger for new tables
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_merchant_settings_updated_at ON public.merchant_settings;
CREATE TRIGGER update_merchant_settings_updated_at
  BEFORE UPDATE ON public.merchant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create merchant with settings on signup
CREATE OR REPLACE FUNCTION public.create_merchant_for_user(
  _user_id uuid,
  _email text,
  _business_name text,
  _country text DEFAULT 'AR'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merchant_id uuid;
  v_default_locale text;
  v_default_currency text;
BEGIN
  -- Set defaults based on country
  IF _country = 'BR' THEN
    v_default_locale := 'pt';
    v_default_currency := 'BRL';
  ELSE
    v_default_locale := 'es';
    v_default_currency := 'ARS';
  END IF;

  -- Create merchant
  INSERT INTO public.merchants (user_id, email, business_name, country, default_locale, default_currency)
  VALUES (_user_id, _email, _business_name, _country, v_default_locale, v_default_currency::currency_code)
  RETURNING id INTO v_merchant_id;

  -- Create merchant_user role
  INSERT INTO public.user_roles (user_id, merchant_id, role)
  VALUES (_user_id, v_merchant_id, 'merchant');

  -- Create default settings
  INSERT INTO public.merchant_settings (merchant_id, locale, display_currency)
  VALUES (v_merchant_id, v_default_locale, v_default_currency);

  RETURN jsonb_build_object(
    'success', true,
    'merchant_id', v_merchant_id,
    'locale', v_default_locale,
    'currency', v_default_currency
  );
END;
$$;

-- Add index for product slug lookups
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug) WHERE is_active = true;