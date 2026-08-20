-- ============================================================================
-- migracion_unificar_f_pens.sql
-- Unifica el nombre de la columna de Fondo de Pensiones.
--
-- El mismo concepto vivía con dos nombres distintos:
--   * `fdo_pens` ("Fdo. Pens.")  → obreros_permanentes, empleados_permanentes,
--                                   gerente_municipal, alcalde
--   * `f_pens`   ("F. Pens.")    → las otras 8 planillas
-- (`cesantes_pensionistas` no tiene la columna y queda intacta.)
--
-- Este parche renombra `fdo_pens` → `f_pens` en esas 4 tablas y redefine sus
-- triggers de totales, que referencian el campo por nombre (`NEW.fdo_pens`) y
-- fallarían en tiempo de ejecución tras el RENAME.
--
-- RENAME COLUMN no toca los datos: los importes existentes se conservan y NO
-- hace falta recalcular totales.
--
-- Ejecutar UNA vez en el SQL Editor de Supabase. Es idempotente: si ya se
-- renombró, el bloque DO no hace nada y los CREATE OR REPLACE son inocuos.
-- El mismo cambio ya está integrado en `_migracion_completa.sql`.
-- ============================================================================

-- 1) Renombrar la columna en las 4 tablas afectadas
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'obreros_permanentes',
    'empleados_permanentes',
    'gerente_municipal',
    'alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'fdo_pens'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'f_pens'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN fdo_pens TO f_pens', t);
      RAISE NOTICE 'Renombrada fdo_pens -> f_pens en %', t;
    END IF;
  END LOOP;
END $$;

-- 2) Redefinir los triggers de totales que referenciaban NEW.fdo_pens
--    (CREATE OR REPLACE conserva el OID, así que los triggers siguen enganchados)

CREATE OR REPLACE FUNCTION public.calc_totales_obreros_permanentes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.rem_bas, 0) + COALESCE(NEW.rem, 0) + COALESCE(NEW.cv_historial, 0) + COALESCE(NEW.b_famil, 0) + COALESCE(NEW.p_pacto, 0) + COALESCE(NEW.mov_p2014, 0) + COALESCE(NEW.pacto_2013, 0) + COALESCE(NEW.pacto_2014, 0) + COALESCE(NEW.laudo_2019, 0) + COALESCE(NEW.inc_3_3, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.otros, 0) + COALESCE(NEW.riesgo_salud, 0) + COALESCE(NEW.neg_col_ds311_22, 0) + COALESCE(NEW.neg_col_ds265_24, 0) + COALESCE(NEW.neg_col_ds279_24, 0) + COALESCE(NEW.neg_col_ds325_25, 0) + COALESCE(NEW.otros_r, 0) + COALESCE(NEW.ref_mov_laudo_2019, 0) + COALESCE(NEW.ref_pacto_2014, 0) + COALESCE(NEW.asig_fam_10rmv, 0) + COALESCE(NEW.ref_mov_histor, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.reunif, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.positiva_vida, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_rehabilita, 0) + COALESCE(NEW.dscto_autoriz_ii, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.pichincha, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.fesalud, 0) + COALESCE(NEW.dscto_somun, 0) + COALESCE(NEW.coop_virgen_n, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.rta_5ta_cat, 0) + COALESCE(NEW.c_sindical, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION public.calc_totales_empleados_permanentes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.b_familiar, 0) + COALESCE(NEW.b_pers, 0) + COALESCE(NEW.inc_neg_col_ds320_22, 0) + COALESCE(NEW.memo_159_2025_ogrrhh_mpi, 0) + COALESCE(NEW.c_vida_tph, 0) + COALESCE(NEW.reaj_c_vida_10, 0) + COALESCE(NEW.reaj_c_vida_7, 0) + COALESCE(NEW.inc_neg_col_ds314_23, 0) + COALESCE(NEW.inc_neg_col_ds268_24, 0) + COALESCE(NEW.inc_neg_col_ds280_24, 0) + COALESCE(NEW.m_jud_inc_ref_mov, 0) + COALESCE(NEW.inc_neg_col_ds326_25, 0) + COALESCE(NEW.inc_3_3, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.bonif_dif, 0) + COALESCE(NEW.reinteg, 0) + COALESCE(NEW.ref_mov, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.coop_la_rehabilitad, 0) + COALESCE(NEW.bco_pichincha, 0) + COALESCE(NEW.coop_s_cristobal, 0) + COALESCE(NEW.ccp, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.dsct_autorizado, 0) + COALESCE(NEW.coop_maria_magdalena, 0) + COALESCE(NEW.la_positiva_vida, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.cuota_sindical, 0) + COALESCE(NEW.coop_virgen_nieves, 0) + COALESCE(NEW.descuento_sitramun, 0) + COALESCE(NEW.regularizacion, 0) + COALESCE(NEW.clap, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION public.calc_totales_gerente_municipal()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.ds_413_19_ef, 0) + COALESCE(NEW.otros_r, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.d_aut_sit_mpi, 0) + COALESCE(NEW.dscto_otros, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ccp, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.dscto_aut_varios, 0) + COALESCE(NEW.coop_m_magd, 0) + COALESCE(NEW.la_positiva_vida, 0) + COALESCE(NEW.cep, 0) + COALESCE(NEW.c_sind_sit_mpi, 0) + COALESCE(NEW.clap, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION public.calc_totales_alcalde()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.ds_413_19_ef, 0) + COALESCE(NEW.otros_r, 0) + COALESCE(NEW.inc_neg_col_ds314_23, 0) + COALESCE(NEW.inc_neg_col_ds268_24, 0) + COALESCE(NEW.inc_neg_col_ds280_24, 0) + COALESCE(NEW.inc_neg_col_ds326_25, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.d_aut_sit_mpi, 0) + COALESCE(NEW.dscto_otros, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ccp, 0) + COALESCE(NEW.faltas_tarda, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.dscto_aut_varios, 0) + COALESCE(NEW.la_positiva_vida, 0) + COALESCE(NEW.cep, 0) + COALESCE(NEW.c_sind_sit_mpi, 0) + COALESCE(NEW.clap, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;
