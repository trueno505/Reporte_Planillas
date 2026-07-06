-- ================================================================
-- migracion_eliminar_cas_subplanillas.sql
-- Parche idempotente para BD viva.
--
-- Elimina 6 de las 7 subplanillas CAS y conserva solo 'cas_general'.
-- Tablas eliminadas (estaban vacías): cas_choferes, cas_i_2025, cas_ii_2023,
-- cas_ii_2024, cas_iii_2025, cas_funcional.
--
-- Recrea la whitelist, los RPCs resumen_planillas/buscar_trabajador y la vista
-- vw_dni_todos SIN esas tablas, luego las elimina (DROP ... CASCADE arrastra
-- triggers, políticas, índices y las saca de la publicación realtime) junto con
-- sus funciones calc_totales_* huérfanas.
--
-- El mismo bloque está integrado al final de _migracion_completa.sql.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- ================================================================

-- 1) Whitelist de tablas (sin las 6)
CREATE OR REPLACE FUNCTION public._es_tabla_planilla(p_tabla text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $function$
  SELECT p_tabla IN (
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  );
$function$;

-- 2) resumen_planillas (sin las 6)
CREATE OR REPLACE FUNCTION public.resumen_planillas(p_periodo date)
RETURNS TABLE(tabla text, n_registros bigint, suma_ingreso numeric, suma_dsctos numeric, suma_liquido numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT 'obreros_permanentes',            COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_permanentes           WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_plazo_indeterminado',    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_plazo_indeterminado   WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_mandato_judicial',       COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_mandato_judicial      WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_concurso',               COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_concurso              WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_necesidad_mercado',      COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_necesidad_mercado     WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_permanentes',          COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_permanentes         WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_contrato_plazo_indet', COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_plazo_indet WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_contrato_provisional', COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_provisional WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_mandato_judicial_24041',COUNT(*),COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_mandato_judicial_24041 WHERE periodo = p_periodo
  UNION ALL SELECT 'cas_general',                    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_general                   WHERE periodo = p_periodo
  UNION ALL SELECT 'cesantes_pensionistas',          COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cesantes_pensionistas         WHERE periodo = p_periodo
  UNION ALL SELECT 'gerente_municipal',              COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.gerente_municipal             WHERE periodo = p_periodo
  UNION ALL SELECT 'alcalde',                        COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.alcalde                       WHERE periodo = p_periodo;
$function$;

-- 3) buscar_trabajador (sin las 6)
CREATE OR REPLACE FUNCTION public.buscar_trabajador(termino text, p_periodo date)
RETURNS TABLE(tabla text, slug text, dni integer, apellidos_y_nombres text, t_liquido numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  patron  TEXT    := '%' || replace(replace(replace(termino, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  es_dni  BOOLEAN := termino ~ '^\d{1,9}$';
  dni_num INTEGER := CASE WHEN termino ~ '^\d{1,9}$' THEN termino::INTEGER ELSE NULL END;
BEGIN
  RETURN QUERY
  SELECT 'obreros_permanentes'::text, 'obreros-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_permanentes t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_plazo_indeterminado'::text, 'obreros-plazo-indeterminado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_plazo_indeterminado t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_mandato_judicial'::text, 'obreros-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_mandato_judicial t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_concurso'::text, 'obreros-concurso'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_concurso t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_necesidad_mercado'::text, 'obreros-necesidad-mercado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_necesidad_mercado t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_permanentes'::text, 'empleados-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_permanentes t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_contrato_plazo_indet'::text, 'empleados-contrato-plazo-indet'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_plazo_indet t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_contrato_provisional'::text, 'empleados-contrato-provisional'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_provisional t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_mandato_judicial_24041'::text, 'empleados-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_mandato_judicial_24041 t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cas_general'::text, 'cas-general'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_general t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cesantes_pensionistas'::text, 'cesantes-pensionistas'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cesantes_pensionistas t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'gerente_municipal'::text, 'gerente-municipal'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.gerente_municipal t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'alcalde'::text, 'alcalde'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.alcalde t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  ORDER BY 4;
END
$function$;

-- 4) vw_dni_todos (sin las 6), preservando security_invoker
CREATE OR REPLACE VIEW public.vw_dni_todos WITH (security_invoker=on) AS
  SELECT dni, periodo, id AS registro_id, 'obreros_permanentes'::text AS tabla FROM public.obreros_permanentes
  UNION ALL SELECT dni, periodo, id, 'obreros_plazo_indeterminado'::text FROM public.obreros_plazo_indeterminado
  UNION ALL SELECT dni, periodo, id, 'obreros_mandato_judicial'::text FROM public.obreros_mandato_judicial
  UNION ALL SELECT dni, periodo, id, 'obreros_concurso'::text FROM public.obreros_concurso
  UNION ALL SELECT dni, periodo, id, 'obreros_necesidad_mercado'::text FROM public.obreros_necesidad_mercado
  UNION ALL SELECT dni, periodo, id, 'empleados_permanentes'::text FROM public.empleados_permanentes
  UNION ALL SELECT dni, periodo, id, 'empleados_contrato_plazo_indet'::text FROM public.empleados_contrato_plazo_indet
  UNION ALL SELECT dni, periodo, id, 'empleados_contrato_provisional'::text FROM public.empleados_contrato_provisional
  UNION ALL SELECT dni, periodo, id, 'empleados_mandato_judicial_24041'::text FROM public.empleados_mandato_judicial_24041
  UNION ALL SELECT dni, periodo, id, 'cas_general'::text FROM public.cas_general
  UNION ALL SELECT dni, periodo, id, 'cesantes_pensionistas'::text FROM public.cesantes_pensionistas
  UNION ALL SELECT dni, periodo, id, 'gerente_municipal'::text FROM public.gerente_municipal
  UNION ALL SELECT dni, periodo, id, 'alcalde'::text FROM public.alcalde;

-- 5) Eliminar las 6 tablas (arrastra triggers, políticas, índices y publicación realtime)
DROP TABLE IF EXISTS public.cas_choferes  CASCADE;
DROP TABLE IF EXISTS public.cas_i_2025    CASCADE;
DROP TABLE IF EXISTS public.cas_ii_2023   CASCADE;
DROP TABLE IF EXISTS public.cas_ii_2024   CASCADE;
DROP TABLE IF EXISTS public.cas_iii_2025  CASCADE;
DROP TABLE IF EXISTS public.cas_funcional CASCADE;

-- 6) Eliminar funciones de totales huérfanas
DROP FUNCTION IF EXISTS public.calc_totales_cas_choferes();
DROP FUNCTION IF EXISTS public.calc_totales_cas_i_2025();
DROP FUNCTION IF EXISTS public.calc_totales_cas_ii_2023();
DROP FUNCTION IF EXISTS public.calc_totales_cas_ii_2024();
DROP FUNCTION IF EXISTS public.calc_totales_cas_iii_2025();
DROP FUNCTION IF EXISTS public.calc_totales_cas_funcional();
