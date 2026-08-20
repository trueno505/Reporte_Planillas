--
-- NOTA (rename snp -> afiliacion): las listas de columnas de identidad de este
-- archivo nombran AMBAS, 'afiliacion' y 'snp'. La columna se renombro en
-- migracion_rename_snp_afiliacion.sql; listar las dos hace que re-ejecutar este
-- parche viejo sea inofensivo, porque tanto el filtro sobre information_schema
-- como la lista blanca de corregir_identidad ignoran los nombres que no existen
-- como columna real. No borres 'afiliacion' de esas listas.
--
-- ================================================================
-- migracion_areas_planillas.sql
-- Parche idempotente para BD viva.
--
-- División por áreas (actividades): agrega la columna `area TEXT` a las 9
-- planillas que tienen áreas (5 de obreros, empleados_permanentes, cas_general,
-- gerente_municipal y alcalde) y trata `area` como dato de IDENTIDAD:
--   • abrir_periodo la copia al generar el mes siguiente,
--   • corregir_identidad permite corregirla en todos los meses.
-- Las listas de áreas por planilla viven en el front (src/config/planillas.js,
-- propiedad `areas`); la BD guarda el texto elegido.
--
-- El mismo bloque está integrado al final de _migracion_completa.sql.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- ================================================================

-- 1) Columna area en las 9 tablas con áreas
ALTER TABLE public.obreros_permanentes         ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.obreros_plazo_indeterminado ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.obreros_mandato_judicial    ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.obreros_concurso            ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.obreros_necesidad_mercado   ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.empleados_permanentes       ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.cas_general                 ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.gerente_municipal           ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.alcalde                     ADD COLUMN IF NOT EXISTS area TEXT;

-- 2) abrir_periodo: copiar también 'area' al generar el mes siguiente
CREATE OR REPLACE FUNCTION public.abrir_periodo(p_tabla text, p_periodo date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_src DATE; v_cols TEXT; n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN RAISE EXCEPTION 'Tabla no permitida: %', p_tabla; END IF;
  p_periodo := date_trunc('month', p_periodo)::date;
  EXECUTE format('SELECT MAX(periodo) FROM public.%I', p_tabla) INTO v_src;
  IF v_src IS NULL THEN RAISE EXCEPTION 'La planilla no tiene datos del mes anterior para generar el nuevo mes.'; END IF;
  IF p_periodo <= v_src THEN RAISE EXCEPTION 'El mes a generar (%) debe ser posterior al mes actual (%).', to_char(p_periodo, 'YYYY-MM'), to_char(v_src, 'YYYY-MM'); END IF;
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_tabla
     AND column_name IN ('dni','apellidos_y_nombres','f_ingreso','fecha_ing','afiliacion','snp','area','tipo_acto_administrativo');
  EXECUTE format('INSERT INTO public.%I (periodo, %s) SELECT $1, %s FROM public.%I WHERE periodo = $2', p_tabla, v_cols, v_cols, p_tabla) USING p_periodo, v_src;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$function$;

-- 3) corregir_identidad: permitir corregir también 'area'
CREATE OR REPLACE FUNCTION public.corregir_identidad(p_tabla text, p_dni integer, p_datos jsonb)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $cor$
DECLARE
  v_allowed TEXT[] := ARRAY['apellidos_y_nombres','f_ingreso','fecha_ing','afiliacion','snp','area','tipo_acto_administrativo'];
  v_cols TEXT[]; v_key TEXT; v_set TEXT := ''; n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN RAISE EXCEPTION 'Tabla no permitida: %', p_tabla; END IF;
  SELECT array_agg(column_name) INTO v_cols FROM information_schema.columns WHERE table_schema = 'public' AND table_name = p_tabla;
  FOR v_key IN SELECT jsonb_object_keys(p_datos) LOOP
    IF NOT (v_key = ANY(v_allowed)) THEN RAISE EXCEPTION 'Campo no editable: %', v_key; END IF;
    IF NOT (v_key = ANY(v_cols)) THEN CONTINUE; END IF;
    IF v_set <> '' THEN v_set := v_set || ', '; END IF;
    IF v_key IN ('f_ingreso','fecha_ing') THEN
      v_set := v_set || format('%I = NULLIF($1->>%L, '''')::date', v_key, v_key);
    ELSE
      v_set := v_set || format('%I = $1->>%L', v_key, v_key);
    END IF;
  END LOOP;
  IF v_set = '' THEN RETURN 0; END IF;
  PERFORM set_config('app.bypass_periodo', '1', true);
  EXECUTE format('UPDATE public.%I SET %s WHERE dni = $2', p_tabla, v_set) USING p_datos, p_dni;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('app.bypass_periodo', '0', true);
  RETURN n;
END
$cor$;
