-- ============================================================================
-- migracion_historico_periodo.sql
-- ----------------------------------------------------------------------------
-- Historización MENSUAL permanente de las 19 planillas. Añade una columna
-- `periodo DATE` (primer día del mes) a cada tabla, de modo que los datos de
-- cada mes se conservan en vez de sobrescribirse.
--
-- Reglas:
--   • Identidad del trabajador (dni, apellidos_y_nombres, fecha de ingreso, snp,
--     tipo_acto_administrativo) se mantiene igual cada mes; las demás columnas
--     varían por mes.
--   • El "mes abierto" (editable) de una planilla = MAX(periodo). Los meses
--     anteriores quedan en SOLO LECTURA (trigger proteger_periodo_cerrado).
--   • El histórico arranca en JUNIO 2026: las filas existentes se asignan a
--     '2026-06-01'.
--
-- Es IDEMPOTENTE: se puede correr varias veces sin romper nada. Pensado para una
-- BD VIVA con datos (no reinstala). El esquema desde cero vive en
-- _migracion_completa.sql, donde estos cambios también están integrados.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Columna `periodo` + unicidad (dni, periodo) + índice, en las 19 tablas
-- ────────────────────────────────────────────────────────────────────────────
DO $mig$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','cas_choferes','cas_i_2025',
    'cas_ii_2023','cas_ii_2024','cas_iii_2025','cas_funcional',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    -- a) columna periodo
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS periodo DATE', t);
    -- b) backfill de filas existentes al primer mes del histórico
    EXECUTE format('UPDATE public.%I SET periodo = DATE ''2026-06-01'' WHERE periodo IS NULL', t);
    -- c) default = mes calendario actual, y NOT NULL
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN periodo SET DEFAULT date_trunc(''month'', now())::date', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN periodo SET NOT NULL', t);
    -- d) quitar la UNIQUE simple de dni (nombre por defecto <tabla>_dni_key)
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_dni_key');
    -- e) unicidad compuesta (dni, periodo)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_dni_periodo_key') THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (dni, periodo)', t, t || '_dni_periodo_key');
    END IF;
    -- f) índice por periodo (para filtrar el mes rápido)
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (periodo)', 'idx_' || t || '_periodo', t);
  END LOOP;
END
$mig$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Bloqueo de meses cerrados (solo el mes abierto = MAX(periodo) es editable)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.proteger_periodo_cerrado()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
DECLARE
  v_max     DATE;
  v_periodo DATE;
BEGIN
  -- Puerta de escape para correcciones de identidad (corregir_identidad).
  IF current_setting('app.bypass_periodo', true) = '1' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  v_periodo := CASE WHEN TG_OP = 'DELETE' THEN OLD.periodo ELSE NEW.periodo END;
  EXECUTE format('SELECT MAX(periodo) FROM public.%I', TG_TABLE_NAME) INTO v_max;

  -- v_max NULL = tabla vacía (primer alta) => permitir.
  IF v_max IS NOT NULL AND v_periodo < v_max THEN
    RAISE EXCEPTION
      'El mes % está cerrado (solo lectura). Solo se puede modificar el mes abierto (%).',
      to_char(v_periodo, 'YYYY-MM'), to_char(v_max, 'YYYY-MM')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END
$fn$;

DO $att$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','cas_choferes','cas_i_2025',
    'cas_ii_2023','cas_ii_2024','cas_iii_2025','cas_funcional',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS proteger_periodo_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER proteger_periodo_%s
       BEFORE INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.proteger_periodo_cerrado()',
      t, t
    );
  END LOOP;
END
$att$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) DNI único global → único POR PERIODO (un DNI no puede estar en dos
--    planillas el mismo mes, pero sí repetirse mes a mes).
-- ────────────────────────────────────────────────────────────────────────────

-- 3a) vista con periodo (se recrea porque cambia el orden de columnas)
DROP VIEW IF EXISTS public.vw_dni_todos;
CREATE VIEW public.vw_dni_todos WITH (security_invoker = on) AS
  SELECT dni, periodo, id AS registro_id, 'obreros_permanentes'::text          AS tabla FROM public.obreros_permanentes
  UNION ALL SELECT dni, periodo, id, 'obreros_plazo_indeterminado'      FROM public.obreros_plazo_indeterminado
  UNION ALL SELECT dni, periodo, id, 'obreros_mandato_judicial'         FROM public.obreros_mandato_judicial
  UNION ALL SELECT dni, periodo, id, 'obreros_concurso'                 FROM public.obreros_concurso
  UNION ALL SELECT dni, periodo, id, 'obreros_necesidad_mercado'        FROM public.obreros_necesidad_mercado
  UNION ALL SELECT dni, periodo, id, 'empleados_permanentes'            FROM public.empleados_permanentes
  UNION ALL SELECT dni, periodo, id, 'empleados_contrato_plazo_indet'   FROM public.empleados_contrato_plazo_indet
  UNION ALL SELECT dni, periodo, id, 'empleados_contrato_provisional'   FROM public.empleados_contrato_provisional
  UNION ALL SELECT dni, periodo, id, 'empleados_mandato_judicial_24041' FROM public.empleados_mandato_judicial_24041
  UNION ALL SELECT dni, periodo, id, 'cas_general'                      FROM public.cas_general
  UNION ALL SELECT dni, periodo, id, 'cas_choferes'                     FROM public.cas_choferes
  UNION ALL SELECT dni, periodo, id, 'cas_i_2025'                       FROM public.cas_i_2025
  UNION ALL SELECT dni, periodo, id, 'cas_ii_2023'                      FROM public.cas_ii_2023
  UNION ALL SELECT dni, periodo, id, 'cas_ii_2024'                      FROM public.cas_ii_2024
  UNION ALL SELECT dni, periodo, id, 'cas_iii_2025'                     FROM public.cas_iii_2025
  UNION ALL SELECT dni, periodo, id, 'cas_funcional'                    FROM public.cas_funcional
  UNION ALL SELECT dni, periodo, id, 'cesantes_pensionistas'            FROM public.cesantes_pensionistas
  UNION ALL SELECT dni, periodo, id, 'gerente_municipal'                FROM public.gerente_municipal
  UNION ALL SELECT dni, periodo, id, 'alcalde'                          FROM public.alcalde;

-- 3b) dni_registro: añadir periodo y mover la PK a (dni, periodo)
ALTER TABLE public.dni_registro ADD COLUMN IF NOT EXISTS periodo DATE;
UPDATE public.dni_registro d
   SET periodo = v.periodo
  FROM public.vw_dni_todos v
 WHERE v.registro_id = d.registro_id AND d.periodo IS NULL;
UPDATE public.dni_registro SET periodo = DATE '2026-06-01' WHERE periodo IS NULL;
ALTER TABLE public.dni_registro ALTER COLUMN periodo SET NOT NULL;
ALTER TABLE public.dni_registro DROP CONSTRAINT IF EXISTS dni_registro_pkey;
ALTER TABLE public.dni_registro ADD PRIMARY KEY (dni, periodo);

-- 3c) sync con periodo
CREATE OR REPLACE FUNCTION public.sync_dni_registro()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $sync$
DECLARE
  v_tabla TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.dni_registro WHERE registro_id = OLD.id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.dni IS NOT DISTINCT FROM OLD.dni THEN
    RETURN NEW;
  END IF;

  -- Conflicto solo dentro del MISMO periodo (mismo DNI en dos planillas el mismo mes)
  SELECT tabla INTO v_tabla
    FROM public.dni_registro
   WHERE dni = NEW.dni AND periodo = NEW.periodo AND registro_id <> NEW.id
   LIMIT 1;
  IF v_tabla IS NOT NULL THEN
    RAISE EXCEPTION
      'El DNI % ya está registrado en la planilla "%" para ese mes. Un mismo DNI no puede existir en dos planillas el mismo periodo.',
      NEW.dni, v_tabla
      USING ERRCODE = 'unique_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dni_registro (dni, periodo, tabla, registro_id)
    VALUES (NEW.dni, NEW.periodo, TG_TABLE_NAME, NEW.id);
  ELSE  -- UPDATE con DNI cambiado
    UPDATE public.dni_registro
       SET dni = NEW.dni, tabla = TG_TABLE_NAME
     WHERE registro_id = NEW.id;
  END IF;

  RETURN NEW;
END
$sync$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) RPCs existentes → ahora reciben el periodo
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.resumen_planillas();
CREATE OR REPLACE FUNCTION public.resumen_planillas(p_periodo DATE)
RETURNS TABLE (
  tabla        TEXT,
  n_registros  BIGINT,
  suma_ingreso NUMERIC,
  suma_dsctos  NUMERIC,
  suma_liquido NUMERIC
)
LANGUAGE sql SECURITY DEFINER STABLE AS $rsm$
  SELECT 'obreros_permanentes',            COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_permanentes           WHERE periodo = p_periodo
  UNION ALL
  SELECT 'obreros_plazo_indeterminado',    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_plazo_indeterminado   WHERE periodo = p_periodo
  UNION ALL
  SELECT 'obreros_mandato_judicial',       COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_mandato_judicial      WHERE periodo = p_periodo
  UNION ALL
  SELECT 'obreros_concurso',               COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_concurso              WHERE periodo = p_periodo
  UNION ALL
  SELECT 'obreros_necesidad_mercado',      COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_necesidad_mercado     WHERE periodo = p_periodo
  UNION ALL
  SELECT 'empleados_permanentes',          COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_permanentes         WHERE periodo = p_periodo
  UNION ALL
  SELECT 'empleados_contrato_plazo_indet', COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_plazo_indet WHERE periodo = p_periodo
  UNION ALL
  SELECT 'empleados_contrato_provisional', COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_provisional WHERE periodo = p_periodo
  UNION ALL
  SELECT 'empleados_mandato_judicial_24041',COUNT(*),COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_mandato_judicial_24041 WHERE periodo = p_periodo
  UNION ALL
  SELECT 'cas_general',                    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_general                   WHERE periodo = p_periodo
  UNION ALL
  SELECT 'cas_choferes',                   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_choferes                  WHERE periodo = p_periodo
  UNION ALL
  SELECT 'cas_i_2025',                     COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_i_2025                    WHERE periodo = p_periodo
  UNION ALL
  SELECT 'cas_ii_2023',                    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_ii_2023                   WHERE periodo = p_periodo
  UNION ALL
  SELECT 'cas_ii_2024',                    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_ii_2024                   WHERE periodo = p_periodo
  UNION ALL
  SELECT 'cas_iii_2025',                   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_iii_2025                  WHERE periodo = p_periodo
  UNION ALL
  SELECT 'cas_funcional',                  COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_funcional                 WHERE periodo = p_periodo
  UNION ALL
  SELECT 'cesantes_pensionistas',          COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cesantes_pensionistas         WHERE periodo = p_periodo
  UNION ALL
  SELECT 'gerente_municipal',              COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.gerente_municipal             WHERE periodo = p_periodo
  UNION ALL
  SELECT 'alcalde',                        COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.alcalde                       WHERE periodo = p_periodo;
$rsm$;

DROP FUNCTION IF EXISTS public.buscar_trabajador(TEXT);
CREATE OR REPLACE FUNCTION public.buscar_trabajador(termino TEXT, p_periodo DATE)
RETURNS TABLE (tabla TEXT, slug TEXT, dni INTEGER, apellidos_y_nombres TEXT, t_liquido NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $bus$
DECLARE
  patron  TEXT    := '%' || replace(replace(replace(termino, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  es_dni  BOOLEAN := termino ~ '^\d{1,9}$';
  dni_num INTEGER := CASE WHEN termino ~ '^\d{1,9}$' THEN termino::INTEGER ELSE NULL END;
BEGIN
  RETURN QUERY
  SELECT 'obreros_permanentes'::text, 'obreros-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_permanentes t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'obreros_plazo_indeterminado'::text, 'obreros-plazo-indeterminado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_plazo_indeterminado t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'obreros_mandato_judicial'::text, 'obreros-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_mandato_judicial t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'obreros_concurso'::text, 'obreros-concurso'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_concurso t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'obreros_necesidad_mercado'::text, 'obreros-necesidad-mercado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_necesidad_mercado t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'empleados_permanentes'::text, 'empleados-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_permanentes t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'empleados_contrato_plazo_indet'::text, 'empleados-contrato-plazo-indet'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_plazo_indet t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'empleados_contrato_provisional'::text, 'empleados-contrato-provisional'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_provisional t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'empleados_mandato_judicial_24041'::text, 'empleados-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_mandato_judicial_24041 t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'cas_general'::text, 'cas-general'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_general t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'cas_choferes'::text, 'cas-choferes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_choferes t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'cas_i_2025'::text, 'cas-i-2025'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_i_2025 t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'cas_ii_2023'::text, 'cas-ii-2023'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_ii_2023 t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'cas_ii_2024'::text, 'cas-ii-2024'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_ii_2024 t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'cas_iii_2025'::text, 'cas-iii-2025'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_iii_2025 t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'cas_funcional'::text, 'cas-funcional'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_funcional t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'cesantes_pensionistas'::text, 'cesantes-pensionistas'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cesantes_pensionistas t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'gerente_municipal'::text, 'gerente-municipal'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.gerente_municipal t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL
  SELECT 'alcalde'::text, 'alcalde'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.alcalde t
    WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  ORDER BY 4;
END
$bus$;

DROP FUNCTION IF EXISTS public.recalcular_totales(TEXT);
CREATE OR REPLACE FUNCTION public.recalcular_totales(p_tabla TEXT, p_periodo DATE)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $rec$
DECLARE
  n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN
    RAISE EXCEPTION 'Tabla no permitida: %', p_tabla;
  END IF;

  EXECUTE format('UPDATE public.%I SET updated_at = now() WHERE periodo = $1', p_tabla) USING p_periodo;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$rec$;

DROP FUNCTION IF EXISTS public.actualizar_columna_planilla(TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.actualizar_columna_planilla(
  p_tabla TEXT, p_periodo DATE, p_columna TEXT, p_valores JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $act$
DECLARE
  col_type TEXT;
  n        INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN
    RAISE EXCEPTION 'Tabla no permitida: %', p_tabla;
  END IF;

  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_tabla AND column_name = p_columna;
  IF col_type IS NULL THEN
    RAISE EXCEPTION 'Columna no existe: %', p_columna;
  END IF;
  IF p_columna IN ('id', 'dni', 'periodo', 'created_at', 'updated_at') THEN
    RAISE EXCEPTION 'Columna protegida: %', p_columna;
  END IF;

  -- UPDATE atómico {dni, valor} acotado al periodo elegido.
  EXECUTE format(
    'UPDATE public.%I AS t
        SET %I = (v.valor)::%s
       FROM jsonb_to_recordset($1) AS v(dni INTEGER, valor TEXT)
      WHERE t.dni = v.dni AND t.periodo = $2',
    p_tabla, p_columna, col_type
  ) USING p_valores, p_periodo;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$act$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) RPCs nuevas: abrir_periodo, periodos_planilla, corregir_identidad
-- ────────────────────────────────────────────────────────────────────────────

-- Genera el mes p_periodo clonando la identidad del último mes existente.
-- Las columnas variables (montos, faltas, etc.) quedan en NULL para llenarlas.
CREATE OR REPLACE FUNCTION public.abrir_periodo(p_tabla TEXT, p_periodo DATE)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $abr$
DECLARE
  v_src  DATE;
  v_cols TEXT;
  n      INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN
    RAISE EXCEPTION 'Tabla no permitida: %', p_tabla;
  END IF;

  p_periodo := date_trunc('month', p_periodo)::date;

  EXECUTE format('SELECT MAX(periodo) FROM public.%I', p_tabla) INTO v_src;
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'La planilla no tiene datos del mes anterior para generar el nuevo mes.';
  END IF;
  IF p_periodo <= v_src THEN
    RAISE EXCEPTION 'El mes a generar (%) debe ser posterior al mes actual (%).',
      to_char(p_periodo, 'YYYY-MM'), to_char(v_src, 'YYYY-MM');
  END IF;

  -- Columnas de identidad que existan en esta planilla (dni + las 5 fijas).
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_tabla
     AND column_name IN ('dni','apellidos_y_nombres','f_ingreso','fecha_ing','snp','tipo_acto_administrativo');

  EXECUTE format(
    'INSERT INTO public.%I (periodo, %s) SELECT $1, %s FROM public.%I WHERE periodo = $2',
    p_tabla, v_cols, v_cols, p_tabla
  ) USING p_periodo, v_src;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$abr$;

-- Lista los periodos (meses) existentes de una planilla, del más nuevo al más viejo.
CREATE OR REPLACE FUNCTION public.periodos_planilla(p_tabla TEXT)
RETURNS TABLE (periodo DATE)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $per$
BEGIN
  IF NOT public._es_tabla_planilla(p_tabla) THEN
    RAISE EXCEPTION 'Tabla no permitida: %', p_tabla;
  END IF;
  RETURN QUERY EXECUTE format('SELECT DISTINCT periodo FROM public.%I ORDER BY periodo DESC', p_tabla);
END
$per$;

-- Corrige los datos FIJOS de un trabajador en TODOS sus meses (incl. cerrados).
CREATE OR REPLACE FUNCTION public.corregir_identidad(p_tabla TEXT, p_dni INTEGER, p_datos JSONB)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $cor$
DECLARE
  v_allowed TEXT[] := ARRAY['apellidos_y_nombres','f_ingreso','fecha_ing','snp','tipo_acto_administrativo'];
  v_cols    TEXT[];
  v_key     TEXT;
  v_set     TEXT := '';
  n         INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN
    RAISE EXCEPTION 'Tabla no permitida: %', p_tabla;
  END IF;

  SELECT array_agg(column_name) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_tabla;

  FOR v_key IN SELECT jsonb_object_keys(p_datos) LOOP
    IF NOT (v_key = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Campo no editable: %', v_key;
    END IF;
    IF NOT (v_key = ANY(v_cols)) THEN
      CONTINUE; -- esta planilla no tiene esa columna
    END IF;
    IF v_set <> '' THEN v_set := v_set || ', '; END IF;
    IF v_key IN ('f_ingreso','fecha_ing') THEN
      v_set := v_set || format('%I = NULLIF($1->>%L, '''')::date', v_key, v_key);
    ELSE
      v_set := v_set || format('%I = $1->>%L', v_key, v_key);
    END IF;
  END LOOP;

  IF v_set = '' THEN RETURN 0; END IF;

  PERFORM set_config('app.bypass_periodo', '1', true);  -- permite tocar meses cerrados (solo esta tx)
  EXECUTE format('UPDATE public.%I SET %s WHERE dni = $2', p_tabla, v_set) USING p_datos, p_dni;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('app.bypass_periodo', '0', true);
  RETURN n;
END
$cor$;
