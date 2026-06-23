-- 11_operaciones.sql
-- RPCs para operaciones masivas ATÓMICAS (una sola transacción por llamada).
-- Reemplazan a los upserts/updates por bloques que hacía el cliente, evitando
-- estados parciales si algo falla a mitad de camino.
--
-- Ambas funciones:
--   · validan que el usuario sea administrador (defensa en profundidad, además de RLS),
--   · validan el nombre de la tabla contra una whitelist (evita SQL injection vía p_tabla).
-- Dependen de: get_my_rol() (04_rls.sql) y los triggers de totales (09_totales.sql).

-- Whitelist de tablas de planillas
CREATE OR REPLACE FUNCTION public._es_tabla_planilla(p_tabla TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT p_tabla IN (
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','cas_choferes','cas_i_2025',
    'cas_ii_2023','cas_ii_2024','cas_iii_2025','cas_funcional',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  );
$$;

-- ─── importar_planilla ──────────────────────────────────────────────────────
-- UPSERT por DNI de un lote de filas (JSONB) en una sola transacción.
-- Las claves desconocidas en el JSON se ignoran; los totales los pone el trigger.
CREATE OR REPLACE FUNCTION public.importar_planilla(p_tabla TEXT, p_filas JSONB)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cols        TEXT;
  set_clause  TEXT;
  n           INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) <> 'administrador' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN
    RAISE EXCEPTION 'Tabla no permitida: %', p_tabla;
  END IF;

  -- Columnas insertables de la tabla (la BD gestiona id/created_at/updated_at)
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_tabla
     AND column_name NOT IN ('id', 'created_at', 'updated_at');

  -- SET para el ON CONFLICT (todas menos las gestionadas y la clave dni)
  SELECT string_agg(format('%I = EXCLUDED.%I', column_name, column_name), ', ')
    INTO set_clause
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_tabla
     AND column_name NOT IN ('id', 'created_at', 'updated_at', 'dni');

  EXECUTE format(
    'INSERT INTO public.%I (%s)
       SELECT %s FROM jsonb_populate_recordset(NULL::public.%I, $1)
     ON CONFLICT (dni) DO UPDATE SET %s',
    p_tabla, cols, cols, p_tabla, set_clause
  ) USING p_filas;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ─── recalcular_totales ─────────────────────────────────────────────────────
-- Fuerza el recálculo de los totales de toda la planilla en una transacción:
-- un UPDATE que dispara el trigger BEFORE UPDATE (09_totales.sql) en cada fila.
CREATE OR REPLACE FUNCTION public.recalcular_totales(p_tabla TEXT)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) <> 'administrador' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN
    RAISE EXCEPTION 'Tabla no permitida: %', p_tabla;
  END IF;

  EXECUTE format('UPDATE public.%I SET updated_at = now()', p_tabla);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
