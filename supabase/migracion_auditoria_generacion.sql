-- =====================================================================
-- AUDITORÍA: acción GENERACION para las filas creadas por abrir_periodo
-- Parche idempotente para BD viva. El mismo bloque está integrado al
-- final de _migracion_completa.sql.
--
-- Antes, "Generar mes siguiente" registraba cada fila clonada como
-- INSERT, indistinguible de un alta manual. Ahora abrir_periodo marca la
-- transacción con el GUC app.generando_mes = '1' y el trigger de
-- auditoría registra esos INSERT con accion = 'GENERACION'.
-- =====================================================================

-- 1) Ampliar el CHECK de auditoria.accion para admitir 'GENERACION'
ALTER TABLE public.auditoria DROP CONSTRAINT IF EXISTS auditoria_accion_check;
ALTER TABLE public.auditoria
  ADD CONSTRAINT auditoria_accion_check
  CHECK (accion IN ('INSERT','UPDATE','DELETE','GENERACION'));

-- 2) registrar_auditoria: un INSERT durante la generación de mes → GENERACION
CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_accion TEXT := TG_OP;
BEGIN
  IF TG_OP = 'INSERT' AND current_setting('app.generando_mes', true) = '1' THEN
    v_accion := 'GENERACION';
  END IF;
  INSERT INTO public.auditoria (tabla, registro_id, accion, usuario_id, datos_ant, datos_nue)
  VALUES (
    TG_TABLE_NAME,
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    v_accion,
    auth.uid(),
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NULL;
END;
$$;

-- 3) abrir_periodo: marcar el GUC durante el INSERT masivo de clonado
CREATE OR REPLACE FUNCTION public.abrir_periodo(p_tabla text, p_periodo date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_src DATE; v_next DATE; v_cols TEXT; n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN RAISE EXCEPTION 'No autorizado'; END IF;
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
     AND column_name IN ('dni','apellidos_y_nombres','f_ingreso','fecha_ing','snp','area','tipo_acto_administrativo');
  PERFORM set_config('app.generando_mes', '1', true);
  EXECUTE format('INSERT INTO public.%I (periodo, %s) SELECT $1, %s FROM public.%I WHERE periodo = $2', p_tabla, v_cols, v_cols, p_tabla) USING p_periodo, v_src;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('app.generando_mes', '0', true);
  RETURN n;
END
$function$;
