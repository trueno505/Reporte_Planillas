-- ================================================================
-- migracion_vacaciones_no_ingreso.sql
-- Parche idempotente para BD viva.
--
-- 'Vacaciones' (columna informativa) dejaba de sumarse a t_ingreso en la
-- planilla de Empleados Permanentes. Se redefine el trigger de totales sin
-- COALESCE(NEW.vacaciones, 0) y se recalculan las filas del mes ABIERTO
-- (los meses cerrados quedan protegidos por proteger_periodo_cerrado).
--
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- El mismo bloque ya está integrado en _migracion_completa.sql.
-- ================================================================

-- 1) Redefinir el trigger de totales sin 'vacaciones' en t_ingreso
CREATE OR REPLACE FUNCTION public.calc_totales_empleados_permanentes()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.b_familiar, 0) + COALESCE(NEW.b_pers, 0) + COALESCE(NEW.inc_neg_col_ds320_22, 0) + COALESCE(NEW.memo_159_2025_ogrrhh_mpi, 0) + COALESCE(NEW.c_vida_tph, 0) + COALESCE(NEW.reaj_c_vida_10, 0) + COALESCE(NEW.reaj_c_vida_7, 0) + COALESCE(NEW.inc_neg_col_ds314_23, 0) + COALESCE(NEW.inc_neg_col_ds268_24, 0) + COALESCE(NEW.inc_neg_col_ds280_24, 0) + COALESCE(NEW.m_jud_inc_ref_mov, 0) + COALESCE(NEW.inc_neg_col_ds326_25, 0) + COALESCE(NEW.inc_3_3, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.bonif_dif, 0) + COALESCE(NEW.reinteg, 0) + COALESCE(NEW.ref_mov, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.fdo_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.coop_la_rehabilitad, 0) + COALESCE(NEW.bco_pichincha, 0) + COALESCE(NEW.coop_s_cristobal, 0) + COALESCE(NEW.ccp, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.dsct_autorizado, 0) + COALESCE(NEW.coop_maria_magdalena, 0) + COALESCE(NEW.la_positiva_vida, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.cuota_sindical, 0) + COALESCE(NEW.coop_virgen_nieves, 0) + COALESCE(NEW.descuento_sitramun, 0) + COALESCE(NEW.regularizacion, 0) + COALESCE(NEW.clap, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

-- 2) Recalcular las filas del mes ABIERTO (dispara el trigger de totales).
--    Los meses cerrados están protegidos y NO se tocan (histórico intacto).
UPDATE public.empleados_permanentes
   SET updated_at = now()
 WHERE periodo = (SELECT MAX(periodo) FROM public.empleados_permanentes);
