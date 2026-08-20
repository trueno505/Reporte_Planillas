-- =====================================================================
-- Renombra la columna `snp` → `afiliacion` en las 12 planillas que la
-- tienen, PRESERVANDO los datos existentes.
--
-- Motivo: el campo guarda 'ONP' o el nombre completo de la AFP, así que
-- "snp" (Sistema Nacional de Pensiones) era un nombre engañoso. El rótulo
-- que ve el usuario pasó de "S.N.P." a "AFIL. A :" en `planillas.js`, y
-- esta migración alinea el nombre físico de la columna.
--
-- NO se toca `descuento_snp` (money): es otra columna, el monto del
-- descuento, y conserva su nombre.
--
-- Cómo usar: pega este archivo completo en el SQL Editor de Supabase y
-- ejecútalo UNA vez. Es idempotente: si ya se renombró (o la columna no
-- existe) simplemente no hace nada, así que correrlo dos veces no falla.
--
-- Nota: el esquema base vive en `_migracion_completa.sql` (ya actualizado
-- para que las instalaciones nuevas creen la columna con el nombre nuevo).
-- Este archivo es solo el parche para bases de datos YA instaladas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Renombrar la columna en cada planilla que la tenga
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'obreros_permanentes',
    'obreros_plazo_indeterminado',
    'obreros_mandato_judicial',
    'obreros_concurso',
    'obreros_necesidad_mercado',
    'empleados_permanentes',
    'empleados_contrato_plazo_indet',
    'empleados_contrato_provisional',
    'empleados_mandato_judicial_24041',
    'cas_general',
    'gerente_municipal',
    'alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'snp'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'afiliacion'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN snp TO afiliacion', t);
      RAISE NOTICE 'Renombrada snp -> afiliacion en %', t;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2) corregir_identidad: aceptar 'afiliacion' como campo fijo editable.
--    Se dejan AMBOS nombres en la lista blanca a propósito: la función ya
--    ignora las claves que no existan como columna real
--    (`IF NOT (v_key = ANY(v_cols)) THEN CONTINUE`), así que un frontend
--    viejo todavía cacheado en el navegador de alguien durante el deploy
--    no revienta con «Campo no editable: snp».
--
--    `abrir_periodo` NO necesita cambios: su versión vigente copia todas
--    las columnas excepto id/periodo/created_at/updated_at/faltas, así que
--    no nombra la columna explícitamente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.corregir_identidad(p_tabla text, p_dni integer, p_datos jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_allowed TEXT[] := ARRAY['apellidos_y_nombres','f_ingreso','fecha_ing','afiliacion','snp','area','tipo_acto_administrativo'];
  v_cols TEXT[]; v_key TEXT; v_set TEXT := ''; n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador', 'superadmin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
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
$function$;
