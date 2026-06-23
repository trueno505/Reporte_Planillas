-- 07_funciones.sql
-- RPCs: resumen de planillas y búsqueda global de trabajadores

-- ─── resumen_planillas ──────────────────────────────────────────────────────
-- Devuelve totales agregados por tabla en un solo viaje.
CREATE OR REPLACE FUNCTION public.resumen_planillas()
RETURNS TABLE (
  tabla        TEXT,
  n_registros  BIGINT,
  suma_ingreso NUMERIC,
  suma_dsctos  NUMERIC,
  suma_liquido NUMERIC
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT 'obreros_permanentes',           COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_permanentes
  UNION ALL
  SELECT 'obreros_plazo_indeterminado',   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_plazo_indeterminado
  UNION ALL
  SELECT 'obreros_mandato_judicial',      COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_mandato_judicial
  UNION ALL
  SELECT 'obreros_concurso',              COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_concurso
  UNION ALL
  SELECT 'obreros_necesidad_mercado',     COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_necesidad_mercado
  UNION ALL
  SELECT 'empleados_permanentes',         COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_permanentes
  UNION ALL
  SELECT 'empleados_contrato_plazo_indet',COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_plazo_indet
  UNION ALL
  SELECT 'empleados_contrato_provisional',COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_provisional
  UNION ALL
  SELECT 'empleados_mandato_judicial_24041',COUNT(*),COALESCE(SUM(t_ingreso),0),COALESCE(SUM(t_dsctos),0),COALESCE(SUM(t_liquido),0) FROM public.empleados_mandato_judicial_24041
  UNION ALL
  SELECT 'cas_general',                   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_general
  UNION ALL
  SELECT 'cas_choferes',                  COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_choferes
  UNION ALL
  SELECT 'cas_i_2025',                    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_i_2025
  UNION ALL
  SELECT 'cas_ii_2023',                   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_ii_2023
  UNION ALL
  SELECT 'cas_ii_2024',                   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_ii_2024
  UNION ALL
  SELECT 'cas_iii_2025',                  COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_iii_2025
  UNION ALL
  SELECT 'cas_funcional',                 COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_funcional
  UNION ALL
  SELECT 'cesantes_pensionistas',         COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cesantes_pensionistas
  UNION ALL
  SELECT 'gerente_municipal',             COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.gerente_municipal
  UNION ALL
  SELECT 'alcalde',                       COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.alcalde;
$$;

-- ─── buscar_trabajador ──────────────────────────────────────────────────────
-- Busca por DNI (=) o nombre (ILIKE) en las 19 tablas.
-- · Escapa los comodines de ILIKE (\, %, _) para que el texto se busque literal.
-- · Solo trata el término como DNI si son 1-9 dígitos (evita overflow de INTEGER).
CREATE OR REPLACE FUNCTION public.buscar_trabajador(termino TEXT)
RETURNS TABLE (tabla TEXT, slug TEXT, dni INTEGER, apellidos_y_nombres TEXT, t_liquido NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  patron  TEXT    := '%' || replace(replace(replace(termino, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  es_dni  BOOLEAN := termino ~ '^\d{1,9}$';
  dni_num INTEGER := CASE WHEN termino ~ '^\d{1,9}$' THEN termino::INTEGER ELSE NULL END;
BEGIN
  RETURN QUERY
  SELECT 'obreros_permanentes'::text, 'obreros-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_permanentes t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'obreros_plazo_indeterminado'::text, 'obreros-plazo-indeterminado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_plazo_indeterminado t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'obreros_mandato_judicial'::text, 'obreros-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_mandato_judicial t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'obreros_concurso'::text, 'obreros-concurso'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_concurso t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'obreros_necesidad_mercado'::text, 'obreros-necesidad-mercado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_necesidad_mercado t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'empleados_permanentes'::text, 'empleados-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_permanentes t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'empleados_contrato_plazo_indet'::text, 'empleados-contrato-plazo-indet'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_plazo_indet t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'empleados_contrato_provisional'::text, 'empleados-contrato-provisional'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_provisional t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'empleados_mandato_judicial_24041'::text, 'empleados-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_mandato_judicial_24041 t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_general'::text, 'cas-general'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_general t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_choferes'::text, 'cas-choferes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_choferes t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_i_2025'::text, 'cas-i-2025'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_i_2025 t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_ii_2023'::text, 'cas-ii-2023'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_ii_2023 t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_ii_2024'::text, 'cas-ii-2024'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_ii_2024 t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_iii_2025'::text, 'cas-iii-2025'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_iii_2025 t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_funcional'::text, 'cas-funcional'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_funcional t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cesantes_pensionistas'::text, 'cesantes-pensionistas'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cesantes_pensionistas t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'gerente_municipal'::text, 'gerente-municipal'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.gerente_municipal t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'alcalde'::text, 'alcalde'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.alcalde t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  ORDER BY 4;
END;
$$;
