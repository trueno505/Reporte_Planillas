-- =====================================================================
-- APORTES PREVISIONALES AUTOMÁTICOS (ONP / AFP)
--
-- Calcula, sobre el TOTAL DE INGRESOS de cada trabajador:
--   · ONP  → descuento_snp = 13 %              (f_pens/p_seg/c_var = 0)
--   · AFP  → f_pens 10 %, p_seg 1,37 % y, SOLO si la comisión es sobre el
--            FLUJO, c_var según la AFP (Integra 1,55 · Profuturo 1,69 ·
--            Habitat 1,47 · Prima 1,60). Con comisión sobre el SALDO,
--            c_var = 0 y quedan únicamente los dos primeros descuentos.
--
-- Los porcentajes NO están escritos en el código: viven en la tabla
-- `parametros_aportes` y solo el superadmin puede modificarlos.
--
-- El cálculo corre dentro del trigger de totales de cada planilla, entre
-- t_ingreso (que es su base) y t_dsctos (que ya suma los montos nuevos),
-- así que estas cuatro columnas pasan a ser CALCULADAS: lo que mande el
-- cliente se sobrescribe.
--
-- Afiliaciones no reconocibles (vacías, 'SI'/'NO' como las de CAS General)
-- se saltan sin tocar ningún monto.
--
-- Cómo usar: pega este archivo en el SQL Editor de Supabase y ejecútalo una
-- vez. Es idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tabla de porcentajes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parametros_aportes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema         TEXT NOT NULL CHECK (sistema IN ('ONP', 'AFP')),
  afp             TEXT CHECK (afp IN ('Integra', 'Prima', 'Habitat', 'Profuturo')),
  concepto        TEXT NOT NULL CHECK (concepto IN ('descuento_snp', 'f_pens', 'p_seg', 'c_var')),
  porcentaje      NUMERIC(7,4) NOT NULL CHECK (porcentaje >= 0 AND porcentaje <= 100),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  -- ONP no tiene AFP ni comisiones; AFP no usa descuento_snp.
  CONSTRAINT parametros_aportes_coherencia CHECK (
    (sistema = 'ONP' AND afp IS     NULL AND concepto =  'descuento_snp') OR
    (sistema = 'AFP' AND afp IS NOT NULL AND concepto IN ('f_pens', 'p_seg', 'c_var'))
  )
);

-- UNIQUE en dos índices parciales: en un UNIQUE normal los NULL de `afp` se
-- consideran distintos entre sí y dejarían meter la fila de ONP dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS parametros_aportes_onp_uk
  ON public.parametros_aportes (sistema, concepto) WHERE afp IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS parametros_aportes_afp_uk
  ON public.parametros_aportes (sistema, afp, concepto) WHERE afp IS NOT NULL;

-- Valores iniciales (los vigentes según el cuadro de la MPI).
INSERT INTO public.parametros_aportes (sistema, afp, concepto, porcentaje) VALUES
  ('ONP', NULL, 'descuento_snp', 13.00),
  ('AFP', 'Integra',   'f_pens', 10.00), ('AFP', 'Integra',   'p_seg', 1.37), ('AFP', 'Integra',   'c_var', 1.55),
  ('AFP', 'Profuturo', 'f_pens', 10.00), ('AFP', 'Profuturo', 'p_seg', 1.37), ('AFP', 'Profuturo', 'c_var', 1.69),
  ('AFP', 'Habitat',   'f_pens', 10.00), ('AFP', 'Habitat',   'p_seg', 1.37), ('AFP', 'Habitat',   'c_var', 1.47),
  ('AFP', 'Prima',     'f_pens', 10.00), ('AFP', 'Prima',     'p_seg', 1.37), ('AFP', 'Prima',     'c_var', 1.60)
ON CONFLICT DO NOTHING;

-- RLS: todos leen (el formulario necesita los % para la vista previa en vivo),
-- solo el superadmin escribe.
ALTER TABLE public.parametros_aportes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parametros_aportes_select ON public.parametros_aportes;
CREATE POLICY parametros_aportes_select ON public.parametros_aportes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS parametros_aportes_write ON public.parametros_aportes;
CREATE POLICY parametros_aportes_write ON public.parametros_aportes
  FOR ALL TO authenticated
  USING      ((SELECT public.get_my_rol()) = 'superadmin')
  WITH CHECK ((SELECT public.get_my_rol()) = 'superadmin');

-- ---------------------------------------------------------------------
-- 2) Normalizadores. Los datos reales traen variantes ('AFP Prima' y
--    'Prima AFP', 'integra' en minúscula…), así que se reconoce la AFP por
--    la palabra clave en vez de exigir una cadena exacta.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.afp_canonica(p_texto TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_texto IS NULL                        THEN NULL
    WHEN lower(p_texto) LIKE '%integra%'        THEN 'Integra'
    WHEN lower(p_texto) LIKE '%profuturo%'      THEN 'Profuturo'
    WHEN lower(p_texto) LIKE '%habitat%'
      OR lower(p_texto) LIKE '%hábitat%'        THEN 'Habitat'
    WHEN lower(p_texto) LIKE '%prima%'          THEN 'Prima'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.comision_canonica(p_texto TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_texto IS NULL                  THEN NULL
    WHEN lower(p_texto) LIKE '%flujo%'    THEN 'flujo'
    WHEN lower(p_texto) LIKE '%saldo%'    THEN 'saldo'
    ELSE NULL
  END
$$;

-- ---------------------------------------------------------------------
-- 3) Cálculo. Devuelve `aplica = false` cuando la afiliación no se
--    reconoce, para que el trigger deje los montos como estaban.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_aportes_pension(
  p_afiliacion    TEXT,
  p_tipo_comision TEXT,
  p_t_ingreso     NUMERIC
)
RETURNS TABLE (aplica BOOLEAN, descuento_snp NUMERIC, f_pens NUMERIC, p_seg NUMERIC, c_var NUMERIC)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE
  v_base NUMERIC := COALESCE(p_t_ingreso, 0);
  v_afp  TEXT;
  v_com  TEXT;
  v_pct  NUMERIC;
BEGIN
  aplica := false; descuento_snp := NULL; f_pens := NULL; p_seg := NULL; c_var := NULL;

  IF p_afiliacion IS NULL OR btrim(p_afiliacion) = '' THEN
    RETURN NEXT; RETURN;
  END IF;

  -- ONP: un único descuento.
  IF upper(btrim(p_afiliacion)) = 'ONP' THEN
    SELECT porcentaje INTO v_pct
      FROM public.parametros_aportes
     WHERE sistema = 'ONP' AND concepto = 'descuento_snp';
    IF v_pct IS NULL THEN RETURN NEXT; RETURN; END IF;
    aplica := true;
    descuento_snp := ROUND(v_base * v_pct / 100, 2);
    f_pens := 0; p_seg := 0; c_var := 0;
    RETURN NEXT; RETURN;
  END IF;

  v_afp := public.afp_canonica(p_afiliacion);
  IF v_afp IS NULL THEN                 -- 'SI', 'NO', texto libre… → no tocar
    RETURN NEXT; RETURN;
  END IF;

  -- Sin tipo de comisión registrado se asume FLUJO, que es la modalidad por
  -- defecto y la que refleja la planilla histórica.
  v_com := COALESCE(public.comision_canonica(p_tipo_comision), 'flujo');

  aplica := true;
  descuento_snp := 0;

  SELECT ROUND(v_base * porcentaje / 100, 2) INTO f_pens
    FROM public.parametros_aportes WHERE sistema='AFP' AND afp=v_afp AND concepto='f_pens';
  SELECT ROUND(v_base * porcentaje / 100, 2) INTO p_seg
    FROM public.parametros_aportes WHERE sistema='AFP' AND afp=v_afp AND concepto='p_seg';

  IF v_com = 'flujo' THEN
    SELECT ROUND(v_base * porcentaje / 100, 2) INTO c_var
      FROM public.parametros_aportes WHERE sistema='AFP' AND afp=v_afp AND concepto='c_var';
  ELSE
    c_var := 0;   -- comisión sobre el saldo: no se descuenta de la remuneración
  END IF;

  f_pens := COALESCE(f_pens, 0);
  p_seg  := COALESCE(p_seg, 0);
  c_var  := COALESCE(c_var, 0);
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_aportes_pension(TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.afp_canonica(TEXT)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.comision_canonica(TEXT)  TO authenticated;

-- ---------------------------------------------------------------------
-- 4) Inyecta el calculo en los 12 triggers de totales ya existentes.
--    Se hace sobre la definicion VIVA de cada funcion (pg_get_functiondef)
--    en vez de reescribirlas enteras: asi no se pisa ninguna particularidad
--    que tenga la base y el parche vale aunque los triggers hayan cambiado.
--    Idempotente: si ya tiene el bloque, lo salta.
-- ---------------------------------------------------------------------
DO $mig$
DECLARE
  t text; v_def text; v_bloque text;
  tablas text[] := ARRAY[
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','gerente_municipal','alcalde'
  ];
BEGIN
  v_bloque := E'  SELECT COALESCE(ap.descuento_snp, NEW.descuento_snp),
'
           || E'         COALESCE(ap.f_pens,        NEW.f_pens),
'
           || E'         COALESCE(ap.p_seg,         NEW.p_seg),
'
           || E'         COALESCE(ap.c_var,         NEW.c_var)
'
           || E'    INTO NEW.descuento_snp, NEW.f_pens, NEW.p_seg, NEW.c_var
'
           || E'    FROM public.calcular_aportes_pension(NEW.afiliacion, NEW.tipo_comision_afp, NEW.t_ingreso) ap;
';

  FOREACH t IN ARRAY tablas LOOP
    SELECT pg_get_functiondef(p.oid) INTO v_def
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'calc_totales_' || t;
    IF v_def IS NULL THEN RAISE EXCEPTION 'No existe calc_totales_%', t; END IF;
    IF position('calcular_aportes_pension' in v_def) > 0 THEN CONTINUE; END IF;
    IF position('NEW.t_dsctos' in v_def) = 0 THEN
      RAISE EXCEPTION 'calc_totales_% no asigna t_dsctos; abortado', t;
    END IF;
    v_def := replace(v_def, '  NEW.t_dsctos', v_bloque || '  NEW.t_dsctos');
    EXECUTE v_def;
  END LOOP;
END $mig$;

-- ---------------------------------------------------------------------
-- 5) Regla de los 65 anos en abrir_periodo: al generar el mes nuevo, quien
--    ya cumplio 65 al primer dia de ese mes pasa a "Comision sobre el saldo"
--    (cumplir el 20-AGO surte efecto en setiembre). El UPDATE dispara el
--    trigger de totales, que pone c_var en 0 y rehace t_dsctos / t_liquido.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.abrir_periodo(p_tabla text, p_periodo date)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_src DATE; v_next DATE; v_cols TEXT; n INTEGER; n65 INTEGER := 0;
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
     AND column_name NOT IN ('id', 'periodo', 'created_at', 'updated_at')
     AND column_name !~ '^faltas';
  PERFORM set_config('app.generando_mes', '1', true);
  EXECUTE format('INSERT INTO public.%I (periodo, %s) SELECT $1, %s FROM public.%I WHERE periodo = $2', p_tabla, v_cols, v_cols, p_tabla) USING p_periodo, v_src;
  GET DIAGNOSTICS n = ROW_COUNT;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=p_tabla AND column_name='tipo_comision_afp'
  ) THEN
    EXECUTE format(
      'UPDATE public.%I
          SET tipo_comision_afp = %L
        WHERE periodo = $1
          AND fecha_nacimiento IS NOT NULL
          AND (fecha_nacimiento + INTERVAL ''65 years'')::date <= $1
          AND public.afp_canonica(afiliacion) IS NOT NULL
          AND COALESCE(public.comision_canonica(tipo_comision_afp), ''flujo'') <> ''saldo''',
      p_tabla, 'Comisión sobre el saldo'
    ) USING p_periodo;
    GET DIAGNOSTICS n65 = ROW_COUNT;
  END IF;

  PERFORM set_config('app.generando_mes', '0', true);
  RETURN n;
END
$function$;

NOTIFY pgrst, 'reload schema';
