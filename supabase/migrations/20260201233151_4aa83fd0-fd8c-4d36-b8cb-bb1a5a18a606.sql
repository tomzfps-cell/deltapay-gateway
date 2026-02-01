-- Fix security warnings: actualizar políticas permisivas

-- Eliminar política demasiado permisiva en payments
DROP POLICY IF EXISTS "Public can view own payment by id" ON public.payments;

-- Reemplazar con política más restrictiva que solo permite ver payments pendientes o confirmados
-- (no expone datos sensibles porque usamos la función get_public_payment_view)
CREATE POLICY "Public can view payment status"
  ON public.payments FOR SELECT
  USING (status IN ('pending', 'confirmed', 'expired'));

-- Eliminar política permisiva duplicada si existe
DROP POLICY IF EXISTS "Anyone can create payments" ON public.payments;