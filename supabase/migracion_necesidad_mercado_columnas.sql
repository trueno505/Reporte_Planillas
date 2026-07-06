-- ================================================================
-- migracion_necesidad_mercado_columnas.sql
-- Parche idempotente para BD viva.
--
-- Rediseña las columnas de la subplanilla obreros_necesidad_mercado:
-- agrega el desglose detallado de ingresos/descuentos (26 money + faltas int)
-- y activa el cálculo automático de totales (antes era sinAutoTotales).
--
-- Aditivo: conserva las columnas previas (dni, apellidos_y_nombres, fecha_ing,
-- dias_lab, snp, t_ingreso, t_dsctos, t_liquido, tipo_acto_administrativo).
-- El label de 'tipo_acto_administrativo' pasa a "OBSERVACIONES" solo en el front.
--
-- El mismo bloque está integrado al final de _migracion_completa.sql.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- ================================================================

-- 1) Nuevas columnas
ALTER TABLE public.obreros_necesidad_mercado
  ADD COLUMN IF NOT EXISTS rem_bas               NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rem                   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rem_contrato          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS p_pacto               NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ds311_2022_ef         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ds313_2023_ef         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ds265_2024ef          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ds279_2024ef          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ds325_2024ef          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS reintegro             NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS riesgo_salud          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS f_pens                NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS p_seg                 NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS c_var                 NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS mas_vida              NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fe_salud              NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rimac_seg             NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS interseguro           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS la_positiva_seguros   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS faltas                INTEGER,
  ADD COLUMN IF NOT EXISTS r_jud                 NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS autorizado_ii_suarez  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS coop_san_miguel       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS coop_san_ch           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS coop_sta_mm           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ir_5ta_cat            NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cuota_sindical        NUMERIC(12,2);

-- 2) Función de totales (11 ingresos → t_ingreso, 15 descuentos → t_dsctos; faltas es int, no suma)
CREATE OR REPLACE FUNCTION public.calc_totales_obreros_necesidad_mercado()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.rem_bas, 0) + COALESCE(NEW.rem, 0) + COALESCE(NEW.rem_contrato, 0) + COALESCE(NEW.p_pacto, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_2023_ef, 0) + COALESCE(NEW.ds265_2024ef, 0) + COALESCE(NEW.ds279_2024ef, 0) + COALESCE(NEW.ds325_2024ef, 0) + COALESCE(NEW.reintegro, 0) + COALESCE(NEW.riesgo_salud, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.autorizado_ii_suarez, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.cuota_sindical, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

-- 3) Trigger BEFORE INSERT/UPDATE
DROP TRIGGER IF EXISTS calc_totales_obreros_necesidad_mercado_trg ON public.obreros_necesidad_mercado;
CREATE TRIGGER calc_totales_obreros_necesidad_mercado_trg
  BEFORE INSERT OR UPDATE ON public.obreros_necesidad_mercado
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_obreros_necesidad_mercado();
