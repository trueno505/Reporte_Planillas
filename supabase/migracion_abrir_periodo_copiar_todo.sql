-- =====================================================================
-- abrir_periodo: copiar TODOS los datos del mes anterior, no solo la
-- identidad fija.
--
-- Antes, "Generar mes siguiente" solo clonaba dni, apellidos_y_nombres,
-- f_ingreso/fecha_ing, snp, area y tipo_acto_administrativo; el resto de
-- columnas (montos, cargo, etc.) quedaba en blanco cada mes.
--
-- Ahora se copian TODAS las columnas del mes anterior, EXCEPTO:
--   - id / periodo / created_at / updated_at (metadatos de la fila, no se copian)
--   - columnas de asistencia ('faltas', 'faltas_tarda'), que deben
--     registrarse de nuevo cada mes.
-- t_ingreso/t_dsctos/t_liquido igual quedan recalculados por el trigger
-- de totales al insertar, así que copiarlos o no es indistinto.
--
-- Idempotente: CREATE OR REPLACE. Aplicar una sola vez en el SQL Editor
-- de Supabase contra una base de datos ya instalada.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.abrir_periodo(p_tabla text, p_periodo date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_src DATE; v_next DATE; v_cols TEXT; n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador', 'superadmin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN RAISE EXCEPTION 'Tabla no permitida: %', p_tabla; END IF;
  p_periodo := date_trunc('month', p_periodo)::date;
  EXECUTE format('SELECT MAX(periodo) FROM public.%I', p_tabla) INTO v_src;
  IF v_src IS NULL THEN RAISE EXCEPTION 'La planilla no tiene datos del mes anterior para generar el nuevo mes.'; END IF;
  v_next := (v_src + INTERVAL '1 month')::date;
  -- Seguridad: solo se puede generar el mes INMEDIATAMENTE siguiente al ultimo
  -- mes existente (v_src + 1). Impide saltos de meses (p.ej. julio -> diciembre).
  IF p_periodo <> v_next THEN
    RAISE EXCEPTION 'Solo se puede generar el mes inmediatamente siguiente (%). Intentaste generar % (ultimo mes existente: %).',
      to_char(v_next, 'YYYY-MM'), to_char(p_periodo, 'YYYY-MM'), to_char(v_src, 'YYYY-MM');
  END IF;
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_tabla
     AND column_name NOT IN ('id', 'periodo', 'created_at', 'updated_at')
     AND column_name !~ '^faltas';
  PERFORM set_config('app.generando_mes', '1', true);
  EXECUTE format('INSERT INTO public.%I (periodo, %s) SELECT $1, %s FROM public.%I WHERE periodo = $2', p_tabla, v_cols, v_cols, p_tabla) USING p_periodo, v_src;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('app.generando_mes', '0', true);
  RETURN n;
END
$function$;

NOTIFY pgrst, 'reload schema';
