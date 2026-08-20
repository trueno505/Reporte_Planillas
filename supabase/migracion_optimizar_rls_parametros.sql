-- =====================================================================
-- Rendimiento: una sola politica permisiva de SELECT en parametros_aportes.
--
-- La politica de escritura se habia declarado FOR ALL, lo que la convierte
-- tambien en politica de SELECT. Junto a la de lectura, Postgres evaluaba DOS
-- policies permisivas en cada consulta (cada una llamando a get_my_rol()).
-- Al separarla por accion, SELECT vuelve a tener una sola.
--
-- Detectado por el linter de rendimiento de Supabase (0006_multiple_permissive_policies).
-- Idempotente.
-- =====================================================================
DROP POLICY IF EXISTS parametros_aportes_write  ON public.parametros_aportes;
DROP POLICY IF EXISTS parametros_aportes_insert ON public.parametros_aportes;
DROP POLICY IF EXISTS parametros_aportes_update ON public.parametros_aportes;
DROP POLICY IF EXISTS parametros_aportes_delete ON public.parametros_aportes;

CREATE POLICY parametros_aportes_insert ON public.parametros_aportes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_my_rol()) = 'superadmin');

CREATE POLICY parametros_aportes_update ON public.parametros_aportes
  FOR UPDATE TO authenticated
  USING      ((SELECT public.get_my_rol()) = 'superadmin')
  WITH CHECK ((SELECT public.get_my_rol()) = 'superadmin');

CREATE POLICY parametros_aportes_delete ON public.parametros_aportes
  FOR DELETE TO authenticated
  USING ((SELECT public.get_my_rol()) = 'superadmin');

-- FK sin indice de cobertura (linter 0001_unindexed_foreign_keys).
CREATE INDEX IF NOT EXISTS idx_parametros_aportes_actualizado_por
  ON public.parametros_aportes (actualizado_por);
