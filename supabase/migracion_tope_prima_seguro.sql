-- =====================================================================
-- TOPE DE LA PRIMA DE SEGURO AFP (Remuneración Máxima Asegurable)
--
-- La Pri. Seg. (p_seg) se calcula sobre el Total de Ingresos, pero como
-- máximo sobre el TOPE de su AFP:
--     p_seg = porcentaje × MIN(t_ingreso, tope)
-- Ej.: Integra con tope 12 672.65 → quien gana 20 000 paga 1.37 % de
-- 12 672.65. Fdo. Pens. y Com. Var. NO tienen tope.
--
-- El tope vive en parametros_aportes.tope (solo en las filas AFP/p_seg,
-- NULL = sin tope) y lo edita el superadmin en /parametros-aportes.
--
-- Cómo usar: pega este archivo en el SQL Editor de Supabase y ejecútalo una
-- vez. Es idempotente (el tope inicial de Integra solo se siembra al crear
-- la columna, así que re-ejecutar no pisa lo que haya editado el superadmin).
-- =====================================================================

DO $mig$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'parametros_aportes' AND column_name = 'tope'
  ) THEN
    ALTER TABLE public.parametros_aportes
      ADD COLUMN tope NUMERIC(12,2),
      ADD CONSTRAINT parametros_aportes_tope CHECK (
        tope IS NULL OR (tope > 0 AND sistema = 'AFP' AND concepto = 'p_seg')
      );
    UPDATE public.parametros_aportes
       SET tope = 12672.65
     WHERE sistema = 'AFP' AND afp = 'Integra' AND concepto = 'p_seg';
  END IF;
END $mig$;

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
  -- Pri. Seg.: la base no pasa del tope de la AFP (NULL = sin tope).
  SELECT ROUND(LEAST(v_base, COALESCE(tope, v_base)) * porcentaje / 100, 2) INTO p_seg
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

NOTIFY pgrst, 'reload schema';
