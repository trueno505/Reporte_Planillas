-- migracion_rol_superadmin.sql
-- -----------------------------------------------------------------------------
-- Añade el 4º rol del sistema: SUPERADMIN.
--
-- Superadmin tiene EXACTAMENTE los mismos privilegios que administrador (RLS
-- de planillas, gestión de usuarios, auditoría), con dos diferencias:
--   1. Su cuenta y su rol son PERMANENTES: nadie (ni siquiera otro superadmin)
--      puede desactivarla, eliminarla ni reasignarle otro rol. Se impone a
--      nivel de base de datos (triggers), no solo en la UI.
--   2. Solo un superadmin puede (des)activar la cuenta de un administrador
--      (impuesto en la Edge Function admin-usuarios, la única pieza que
--      conoce quién llama). Los cambios de rol quedan además registrados en
--      'auditoria' (tabla='perfiles'), visibles SOLO para superadmin.
--
-- Requiere desplegar las Edge Functions admin-usuarios y crear-usuario
-- actualizadas (supabase/functions/) para que apliquen la restricción (2).
--
-- Idempotente: se puede re-ejecutar sin efectos adversos.
-- Aplicado en la BD viva (lsmraamhhuccrhslwrtg) el 2026-07-22.
-- -----------------------------------------------------------------------------

-- 1) Permitir 'superadmin' en perfiles.rol
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('consultor', 'editor', 'administrador', 'superadmin'));

-- 2) proteger_rol_perfil: administrador Y superadmin pueden reasignar roles,
--    pero el rol 'superadmin' es inmutable una vez asignado (nadie puede
--    cambiarlo, ni siquiera otro superadmin).
CREATE OR REPLACE FUNCTION public.proteger_rol_perfil()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF OLD.rol = 'superadmin' AND NEW.rol IS DISTINCT FROM OLD.rol THEN
    NEW.rol := OLD.rol;
  ELSIF NEW.rol IS DISTINCT FROM OLD.rol
        AND (SELECT public.get_my_rol()) NOT IN ('administrador', 'superadmin') THEN
    NEW.rol := OLD.rol;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) La cuenta superadmin nunca puede eliminarse: bloquea el DELETE en
--    perfiles, lo que aborta también el DELETE en cascada desde auth.users
--    (panel de Supabase, Admin API o SQL directo).
CREATE OR REPLACE FUNCTION public.proteger_superadmin_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF OLD.rol = 'superadmin' THEN
    RAISE EXCEPTION 'La cuenta superadmin no se puede eliminar.';
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS proteger_superadmin_delete ON public.perfiles;
CREATE TRIGGER proteger_superadmin_delete
  BEFORE DELETE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_superadmin_delete();

-- 4) La cuenta superadmin nunca puede desactivarse (ban) a nivel BD, sin
--    importar quién o cómo lo intente.
CREATE OR REPLACE FUNCTION public.proteger_superadmin_ban()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.banned_until IS DISTINCT FROM OLD.banned_until
     AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = NEW.id AND rol = 'superadmin') THEN
    NEW.banned_until := OLD.banned_until;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS proteger_superadmin_ban ON auth.users;
CREATE TRIGGER proteger_superadmin_ban
  BEFORE UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.proteger_superadmin_ban();

-- 5) RLS de perfiles: administrador Y superadmin gestionan todos los perfiles
DROP POLICY IF EXISTS "perfiles_admin_select_all" ON public.perfiles;
CREATE POLICY "perfiles_admin_select_all" ON public.perfiles
  FOR SELECT TO authenticated
  USING ((select get_my_rol()) IN ('administrador', 'superadmin'));

DROP POLICY IF EXISTS "perfiles_admin_update_all" ON public.perfiles;
CREATE POLICY "perfiles_admin_update_all" ON public.perfiles
  FOR UPDATE TO authenticated
  USING ((select get_my_rol()) IN ('administrador', 'superadmin'))
  WITH CHECK ((select get_my_rol()) IN ('administrador', 'superadmin'));

-- 6) Auditoría: el log general (planillas) lo ven administrador+superadmin;
--    el log de cambios de rol (tabla='perfiles') lo ve SOLO superadmin.
DROP POLICY IF EXISTS "auditoria_select_admin" ON public.auditoria;
CREATE POLICY "auditoria_select_admin" ON public.auditoria
  FOR SELECT TO authenticated
  USING (
    (select get_my_rol()) = 'superadmin'
    OR ((select get_my_rol()) = 'administrador' AND tabla <> 'perfiles')
  );

-- 7) Registrar cada cambio de rol en 'auditoria' (tabla='perfiles').
CREATE OR REPLACE FUNCTION public.registrar_cambio_rol()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.rol IS DISTINCT FROM OLD.rol THEN
    INSERT INTO public.auditoria (tabla, registro_id, accion, usuario_id, datos_ant, datos_nue)
    VALUES ('perfiles', NEW.id, 'UPDATE', auth.uid(),
            jsonb_build_object('rol', OLD.rol), jsonb_build_object('rol', NEW.rol));
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS auditoria_cambio_rol ON public.perfiles;
CREATE TRIGGER auditoria_cambio_rol
  AFTER UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.registrar_cambio_rol();

-- 8) RLS de las 13 tablas de planilla: superadmin = mismos privilegios que administrador
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','cesantes_pensionistas',
    'gerente_municipal','alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_select" ON public.%I
       FOR SELECT TO authenticated
       USING ((select get_my_rol()) IN (''consultor'', ''editor'', ''administrador'', ''superadmin''))',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_insert" ON public.%I
       FOR INSERT TO authenticated
       WITH CHECK ((select get_my_rol()) IN (''editor'', ''administrador'', ''superadmin''))',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_update" ON public.%I
       FOR UPDATE TO authenticated
       USING ((select get_my_rol()) IN (''editor'', ''administrador'', ''superadmin''))
       WITH CHECK ((select get_my_rol()) IN (''editor'', ''administrador'', ''superadmin''))',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_delete" ON public.%I
       FOR DELETE TO authenticated
       USING ((select get_my_rol()) IN (''editor'', ''administrador'', ''superadmin''))',
      t, t
    );
  END LOOP;
END;
$$;

-- 9) dni_registro: mismo criterio de lectura
DROP POLICY IF EXISTS dni_registro_select ON public.dni_registro;
CREATE POLICY dni_registro_select ON public.dni_registro
  FOR SELECT TO authenticated
  USING ((select public.get_my_rol()) IN ('consultor', 'editor', 'administrador', 'superadmin'));

-- 10) RPCs: añadir 'superadmin' donde ya se permitía 'administrador'
CREATE OR REPLACE FUNCTION public.recalcular_totales(p_tabla text, p_periodo date)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador', 'superadmin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN RAISE EXCEPTION 'Tabla no permitida: %', p_tabla; END IF;
  EXECUTE format('UPDATE public.%I SET updated_at = now() WHERE periodo = $1', p_tabla) USING p_periodo;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_columna_planilla(p_tabla text, p_periodo date, p_columna text, p_valores jsonb)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE col_type TEXT; n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador', 'superadmin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN RAISE EXCEPTION 'Tabla no permitida: %', p_tabla; END IF;
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = p_tabla AND column_name = p_columna;
  IF col_type IS NULL THEN RAISE EXCEPTION 'Columna no existe: %', p_columna; END IF;
  IF p_columna IN ('id', 'dni', 'periodo', 'created_at', 'updated_at') THEN RAISE EXCEPTION 'Columna protegida: %', p_columna; END IF;
  EXECUTE format(
    'UPDATE public.%I AS t SET %I = (v.valor)::%s FROM jsonb_to_recordset($1) AS v(dni INTEGER, valor TEXT) WHERE t.dni = v.dni AND t.periodo = $2',
    p_tabla, p_columna, col_type
  ) USING p_valores, p_periodo;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$function$;

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

CREATE OR REPLACE FUNCTION public.corregir_identidad(p_tabla text, p_dni integer, p_datos jsonb)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_allowed TEXT[] := ARRAY['apellidos_y_nombres','f_ingreso','fecha_ing','snp','area','tipo_acto_administrativo'];
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

-- 11) Las funciones de trigger nunca deben llamarse directamente vía RPC.
REVOKE EXECUTE ON FUNCTION public.proteger_superadmin_delete() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.proteger_superadmin_ban()    FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.registrar_cambio_rol()       FROM anon, authenticated, public;

NOTIFY pgrst, 'reload schema';
