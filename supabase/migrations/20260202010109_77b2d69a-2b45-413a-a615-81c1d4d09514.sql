-- Tabla de auditoría para preferencias de Mercado Pago
CREATE TABLE public.mp_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  preference_id TEXT NOT NULL,
  mp_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_mp_preferences_payment_id ON public.mp_preferences(payment_id);
CREATE INDEX idx_mp_preferences_preference_id ON public.mp_preferences(preference_id);
CREATE UNIQUE INDEX idx_mp_preferences_payment_unique ON public.mp_preferences(payment_id) WHERE status IN ('pending', 'approved');

-- Trigger para updated_at
CREATE TRIGGER update_mp_preferences_updated_at
  BEFORE UPDATE ON public.mp_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.mp_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: solo admins pueden ver/modificar
CREATE POLICY "Admins can manage mp_preferences"
  ON public.mp_preferences
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Merchants pueden ver sus propias preferencias (join con payments)
CREATE POLICY "Merchants can view own mp_preferences"
  ON public.mp_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = mp_preferences.payment_id
      AND user_belongs_to_merchant(auth.uid(), p.merchant_id)
    )
  );

-- Agregar campo mp_preference_id a payments para referencia rápida
ALTER TABLE public.payments
  ADD COLUMN mp_preference_id TEXT;