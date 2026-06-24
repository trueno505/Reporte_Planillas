-- =====================================================================
-- _migracion_3roles.sql
-- Migración para bases de datos YA instaladas: añade el tercer rol "editor".
--
-- Roles resultantes:
--   · consultor      → SELECT + exportar + boleta PDF (sin cambios)
--   · editor         → consultor + CRUD de datos + Excel (importar/actualizar/
--                      borrar/recalcular). NO gestiona usuarios ni ve auditoría.
--   · administrador  → control total (datos + usuarios + auditoría)
--
-- Pega TODO este archivo en el SQL Editor de Supabase y ejecútalo una vez.
-- Es idempotente: puedes correrlo más de una vez sin error.
-- (Para instalaciones NUEVAS no hace falta: _migracion_completa.sql ya incluye
--  el rol editor.)
-- =====================================================================

-- ─── 1) Permitir el valor 'editor' en perfiles.rol ──────────────────────────
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('consultor', 'editor', 'administrador'));

-- ─── 2) Reescribir las políticas RLS de las 19 planillas ────────────────────
-- SELECT → consultor, editor o administrador
-- INSERT / UPDATE / DELETE → editor o administrador
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
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
    'cas_choferes',
    'cas_i_2025',
    'cas_ii_2023',
    'cas_ii_2024',
    'cas_iii_2025',
    'cas_funcional',
    'cesantes_pensionistas',
    'gerente_municipal',
    'alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Borrar las políticas previas (cualquiera de las dos versiones) y recrearlas
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

    EXECUTE format(
      'CREATE POLICY "%s_select" ON public.%I
       FOR SELECT TO authenticated
       USING ((select get_my_rol()) IN (''consultor'', ''editor'', ''administrador''))',
      t, t
    );

    EXECUTE format(
      'CREATE POLICY "%s_insert" ON public.%I
       FOR INSERT TO authenticated
       WITH CHECK ((select get_my_rol()) IN (''editor'', ''administrador''))',
      t, t
    );

    EXECUTE format(
      'CREATE POLICY "%s_update" ON public.%I
       FOR UPDATE TO authenticated
       USING ((select get_my_rol()) IN (''editor'', ''administrador''))
       WITH CHECK ((select get_my_rol()) IN (''editor'', ''administrador''))',
      t, t
    );

    EXECUTE format(
      'CREATE POLICY "%s_delete" ON public.%I
       FOR DELETE TO authenticated
       USING ((select get_my_rol()) IN (''editor'', ''administrador''))',
      t, t
    );
  END LOOP;
END;
$$;

-- ─── 3) Permitir editor en los RPCs masivos (CREATE OR REPLACE) ──────────────
-- Solo cambia la línea de autorización: <> 'administrador'  →  NOT IN (editor, admin)

CREATE OR REPLACE FUNCTION public.importar_planilla(p_tabla TEXT, p_filas JSONB)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cols        TEXT;
  set_clause  TEXT;
  n           INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN
    RAISE EXCEPTION 'Tabla no permitida: %', p_tabla;
  END IF;

  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_tabla
     AND column_name NOT IN ('id', 'created_at', 'updated_at');

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

CREATE OR REPLACE FUNCTION public.recalcular_totales(p_tabla TEXT)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN
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

CREATE OR REPLACE FUNCTION public.actualizar_columna_planilla(
  p_tabla TEXT, p_columna TEXT, p_valores JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
  IF p_columna IN ('id', 'dni', 'created_at', 'updated_at') THEN
    RAISE EXCEPTION 'Columna protegida: %', p_columna;
  END IF;

  EXECUTE format(
    'UPDATE public.%I AS t
        SET %I = (v.valor)::%s
       FROM jsonb_to_recordset($1) AS v(dni INTEGER, valor TEXT)
      WHERE t.dni = v.dni',
    p_tabla, p_columna, col_type
  ) USING p_valores;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Nota: las políticas de auditoría y de gestión de perfiles siguen siendo
-- exclusivas de 'administrador' (sin cambios). El editor no ve el historial ni
-- administra usuarios.

NOTIFY pgrst, 'reload schema';
