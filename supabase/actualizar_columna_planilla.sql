-- actualizar_columna_planilla.sql
-- Aplícalo en el SQL Editor de Supabase si tu base de datos YA está instalada
-- y solo quieres añadir la función para "Actualizar columna por Excel".
-- (Ya está incluida en _migracion_completa.sql para instalaciones nuevas.)
--
-- Actualiza UNA sola columna de una planilla, emparejando por DNI, a partir de
-- una lista JSONB [{dni, valor}, ...] en una sola transacción atómica.
-- Los DNI que no existan en la tabla simplemente no se tocan (sin error).

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

NOTIFY pgrst, 'reload schema';
