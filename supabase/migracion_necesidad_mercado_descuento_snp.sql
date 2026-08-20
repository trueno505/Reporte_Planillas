-- =====================================================================
-- Añade la columna `descuento_snp` a `obreros_necesidad_mercado`, la única
-- planilla que la tenía faltando (aparte de `cesantes_pensionistas`, que
-- queda fuera a propósito: los pensionistas no aportan al SNP).
--
-- Con esto son 12 las planillas con `descuento_snp`, alineadas con las
-- otras 11 que ya la tenían.
--
-- IMPORTANTE — dos pasos, no uno: `descuento_snp` es una columna de
-- DESCUENTO, así que no basta con crearla. El trigger de totales suma los
-- descuentos por nombre, uno a uno, y si no se recrea incluyéndola, lo que
-- se cargue en esa columna NO se restaría del Total Líquido y la planilla
-- cuadraría mal en silencio.
--
-- Las filas existentes quedan con NULL, que el trigger trata como 0
-- (COALESCE), así que ningún total cambia hasta que se cargue un valor.
--
-- Cómo usar: pega este archivo completo en el SQL Editor de Supabase y
-- ejecútalo UNA vez. Es idempotente: correrlo dos veces no falla.
--
-- Nota: el esquema base vive en `_migracion_completa.sql` (ya actualizado
-- para que las instalaciones nuevas creen la columna). Este archivo es solo
-- el parche para bases de datos YA instaladas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) La columna. Mismo tipo que en las otras 11 planillas: NUMERIC(12,2)
--    nullable y sin default.
-- ---------------------------------------------------------------------
ALTER TABLE public.obreros_necesidad_mercado
  ADD COLUMN IF NOT EXISTS descuento_snp NUMERIC(12,2);

-- ---------------------------------------------------------------------
-- 2) Trigger de totales, ahora sumando `descuento_snp` en t_dsctos.
--    El orden de los sumandos replica el de `planillas.js`, donde la
--    columna va justo después de `t_ingreso`, encabezando los descuentos.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calc_totales_obreros_necesidad_mercado()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  NEW.t_ingreso := ROUND((
      COALESCE(NEW.rem_bas, 0) + COALESCE(NEW.rem, 0) + COALESCE(NEW.rem_contrato, 0)
    + COALESCE(NEW.p_pacto, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_2023_ef, 0)
    + COALESCE(NEW.ds265_2024ef, 0) + COALESCE(NEW.ds279_2024ef, 0) + COALESCE(NEW.ds325_2024ef, 0)
    + COALESCE(NEW.reintegro, 0) + COALESCE(NEW.riesgo_salud, 0)
  )::numeric, 2);

  NEW.t_dsctos := ROUND((
      COALESCE(NEW.descuento_snp, 0)
    + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0)
    + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.rimac_seg, 0)
    + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.la_positiva_seguros, 0)
    + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.autorizado_ii_suarez, 0)
    + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_san_ch, 0)
    + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.ir_5ta_cat, 0)
    + COALESCE(NEW.cuota_sindical, 0)
  )::numeric, 2);

  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$function$;
