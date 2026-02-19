-- Política para que admins puedan actualizar payouts (aprobar/rechazar/completar retiros)
-- La tabla payouts actualmente NO tiene política UPDATE, bloqueando toda actualización.
CREATE POLICY "Admins can update payouts"
  ON public.payouts
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
