-- ================================================================
-- 09_totales.sql  —  Generado automáticamente por scripts/genSql.mjs
-- NO editar a mano: editar src/config/planillas.js y regenerar
--
-- Calcula t_ingreso, t_dsctos y t_liquido en la propia base de datos en cada
-- INSERT/UPDATE. La BD es la fuente de verdad: aunque el cliente envíe totales,
-- el trigger los recalcula, evitando totales inconsistentes y condiciones de
-- carrera entre ediciones simultáneas.
-- ================================================================


-- obreros_permanentes
CREATE OR REPLACE FUNCTION public.calc_totales_obreros_permanentes()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.rem_bas, 0) + COALESCE(NEW.rem, 0) + COALESCE(NEW.cv_historial, 0) + COALESCE(NEW.b_famil, 0) + COALESCE(NEW.p_pacto, 0) + COALESCE(NEW.mov_p2014, 0) + COALESCE(NEW.pacto_2013, 0) + COALESCE(NEW.pacto_2014, 0) + COALESCE(NEW.laudo_2019, 0) + COALESCE(NEW.inc_3_3, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.otros, 0) + COALESCE(NEW.riesgo_salud, 0) + COALESCE(NEW.neg_col_ds311_22, 0) + COALESCE(NEW.neg_col_ds265_24, 0) + COALESCE(NEW.neg_col_ds279_24, 0) + COALESCE(NEW.neg_col_ds325_25, 0) + COALESCE(NEW.otros_r, 0) + COALESCE(NEW.ref_mov_laudo_2019, 0) + COALESCE(NEW.ref_pacto_2014, 0) + COALESCE(NEW.asig_fam_10rmv, 0) + COALESCE(NEW.ref_mov_histor, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.reunif, 0) + COALESCE(NEW.fdo_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.positiva_vida, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_rehabilita, 0) + COALESCE(NEW.dscto_autoriz_ii, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.pichincha, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.fesalud, 0) + COALESCE(NEW.dscto_somun, 0) + COALESCE(NEW.coop_virgen_n, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.rta_5ta_cat, 0) + COALESCE(NEW.c_sindical, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_obreros_permanentes_trg ON public.obreros_permanentes;
CREATE TRIGGER calc_totales_obreros_permanentes_trg
  BEFORE INSERT OR UPDATE ON public.obreros_permanentes
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_obreros_permanentes();


-- obreros_plazo_indeterminado
CREATE OR REPLACE FUNCTION public.calc_totales_obreros_plazo_indeterminado()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.mov_p2014, 0) + COALESCE(NEW.p_pacto, 0) + COALESCE(NEW.inc_anc10_m038_11_rh, 0) + COALESCE(NEW.rem_cont_plazo_indet, 0) + COALESCE(NEW.pacto_2013, 0) + COALESCE(NEW.pacto_2014, 0) + COALESCE(NEW.laudo_2019, 0) + COALESCE(NEW.inc_rmv_ds016_05, 0) + COALESCE(NEW.inc_rmv_ds022_07, 0) + COALESCE(NEW.inc_anc_mem005_09, 0) + COALESCE(NEW.niv_fe_errat_rga002_16, 0) + COALESCE(NEW.ref_pacto_2014, 0) + COALESCE(NEW.ref_mov_laudo_2019, 0) + COALESCE(NEW.asig_fam_10rmv, 0) + COALESCE(NEW.conv_col_ds325_25, 0) + COALESCE(NEW.conv_col_ds265_24, 0) + COALESCE(NEW.conv_col_ds279_24, 0) + COALESCE(NEW.neg_col_ds313_23, 0) + COALESCE(NEW.conv_col_ds311_22, 0) + COALESCE(NEW.riesgo_salud, 0) + COALESCE(NEW.ref_mov_98_ra005_22, 0) + COALESCE(NEW.otros_r, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.positiva_vida, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.pichincha, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_rehabilita, 0) + COALESCE(NEW.renta_5ta_cat, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.somun, 0) + COALESCE(NEW.coop_virgen_n, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.fesalud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.c_sind, 0) + COALESCE(NEW.dscto_autoriz, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_obreros_plazo_indeterminado_trg ON public.obreros_plazo_indeterminado;
CREATE TRIGGER calc_totales_obreros_plazo_indeterminado_trg
  BEFORE INSERT OR UPDATE ON public.obreros_plazo_indeterminado
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_obreros_plazo_indeterminado();


-- obreros_mandato_judicial
CREATE OR REPLACE FUNCTION public.calc_totales_obreros_mandato_judicial()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.rem_cont_plazo_indet, 0) + COALESCE(NEW.neg_col_ds313_23, 0) + COALESCE(NEW.riesgo_salud, 0) + COALESCE(NEW.asig_fam_10rmv, 0) + COALESCE(NEW.conv_col_ds265_24, 0) + COALESCE(NEW.conv_col_ds279_24, 0) + COALESCE(NEW.otros_r, 0) + COALESCE(NEW.conv_col_ds325_25, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_rehabilita, 0) + COALESCE(NEW.renta_5ta_cat, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.pichincha, 0) + COALESCE(NEW.somun, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.fesalud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.c_sind, 0) + COALESCE(NEW.dscto_ii, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_obreros_mandato_judicial_trg ON public.obreros_mandato_judicial;
CREATE TRIGGER calc_totales_obreros_mandato_judicial_trg
  BEFORE INSERT OR UPDATE ON public.obreros_mandato_judicial
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_obreros_mandato_judicial();


-- obreros_concurso
CREATE OR REPLACE FUNCTION public.calc_totales_obreros_concurso()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.rem_reunificada, 0) + COALESCE(NEW.rem_cont_plazo_indet, 0) + COALESCE(NEW.ref_mov_ra1596_98_ampi, 0) + COALESCE(NEW.bonif_riesgo_salud_10, 0) + COALESCE(NEW.otros_personal_servicio, 0) + COALESCE(NEW.subv_financ_laudo_2014, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_23_ef, 0) + COALESCE(NEW.ds265_24_ef, 0) + COALESCE(NEW.asig_fam, 0) + COALESCE(NEW.neg_col_ctral_2024_2025, 0) + COALESCE(NEW.neg_col_ctral_2025_2026, 0) + COALESCE(NEW.otros_r, 0) + COALESCE(NEW.costo_vida_laudo_2019, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.comis_variable, 0) + COALESCE(NEW.retenc_judicial, 0) + COALESCE(NEW.rimac, 0) + COALESCE(NEW.cuota_sindical, 0) + COALESCE(NEW.coop_la_rehabilitadora, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_san_cristobal, 0) + COALESCE(NEW.coop_virgen_las_nieves, 0) + COALESCE(NEW.otros_r_dtos, 0) + COALESCE(NEW.dscto_ii, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_obreros_concurso_trg ON public.obreros_concurso;
CREATE TRIGGER calc_totales_obreros_concurso_trg
  BEFORE INSERT OR UPDATE ON public.obreros_concurso
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_obreros_concurso();


-- empleados_permanentes
CREATE OR REPLACE FUNCTION public.calc_totales_empleados_permanentes()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.vacaciones, 0) + COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.b_familiar, 0) + COALESCE(NEW.b_pers, 0) + COALESCE(NEW.inc_neg_col_ds320_22, 0) + COALESCE(NEW.memo_159_2025_ogrrhh_mpi, 0) + COALESCE(NEW.c_vida_tph, 0) + COALESCE(NEW.reaj_c_vida_10, 0) + COALESCE(NEW.reaj_c_vida_7, 0) + COALESCE(NEW.inc_neg_col_ds314_23, 0) + COALESCE(NEW.inc_neg_col_ds268_24, 0) + COALESCE(NEW.inc_neg_col_ds280_24, 0) + COALESCE(NEW.m_jud_inc_ref_mov, 0) + COALESCE(NEW.inc_neg_col_ds326_25, 0) + COALESCE(NEW.inc_3_3, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.bonif_dif, 0) + COALESCE(NEW.reinteg, 0) + COALESCE(NEW.ref_mov, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.fdo_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.coop_la_rehabilitad, 0) + COALESCE(NEW.bco_pichincha, 0) + COALESCE(NEW.coop_s_cristobal, 0) + COALESCE(NEW.ccp, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.dsct_autorizado, 0) + COALESCE(NEW.coop_maria_magdalena, 0) + COALESCE(NEW.la_positiva_vida, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.cuota_sindical, 0) + COALESCE(NEW.coop_virgen_nieves, 0) + COALESCE(NEW.descuento_sitramun, 0) + COALESCE(NEW.regularizacion, 0) + COALESCE(NEW.clap, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_empleados_permanentes_trg ON public.empleados_permanentes;
CREATE TRIGGER calc_totales_empleados_permanentes_trg
  BEFORE INSERT OR UPDATE ON public.empleados_permanentes
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_empleados_permanentes();


-- empleados_contrato_plazo_indet
CREATE OR REPLACE FUNCTION public.calc_totales_empleados_contrato_plazo_indet()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.rem_cont, 0) + COALESCE(NEW.neg_cent_2024, 0) + COALESCE(NEW.otros_r, 0) + COALESCE(NEW.inc_neg_col_ds314_23, 0) + COALESCE(NEW.inc_neg_col_ds268_24, 0) + COALESCE(NEW.inc_neg_col_ds280_24, 0) + COALESCE(NEW.inc_neg_col_ds326_25, 0) + COALESCE(NEW.reintegro, 0) + COALESCE(NEW.ref, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_m_magd, 0) + COALESCE(NEW.desc_var, 0) + COALESCE(NEW.seguro_fe_salud, 0) + COALESCE(NEW.banco_pichincha, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.coop_la_rehabilitadora, 0) + COALESCE(NEW.coop_virgen_las_nieves, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_empleados_contrato_plazo_indet_trg ON public.empleados_contrato_plazo_indet;
CREATE TRIGGER calc_totales_empleados_contrato_plazo_indet_trg
  BEFORE INSERT OR UPDATE ON public.empleados_contrato_plazo_indet
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_empleados_contrato_plazo_indet();


-- empleados_contrato_provisional
CREATE OR REPLACE FUNCTION public.calc_totales_empleados_contrato_provisional()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.rem_cont, 0) + COALESCE(NEW.neg_cent_2024, 0) + COALESCE(NEW.otros_r, 0) + COALESCE(NEW.inc_neg_col_ds314_23, 0) + COALESCE(NEW.inc_neg_col_ds268_24, 0) + COALESCE(NEW.inc_neg_col_ds280_24, 0) + COALESCE(NEW.inc_neg_col_ds326_25, 0) + COALESCE(NEW.reintegro, 0) + COALESCE(NEW.ref, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_m_magd, 0) + COALESCE(NEW.desc_var, 0) + COALESCE(NEW.seguro_fe_salud, 0) + COALESCE(NEW.banco_pichincha, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.coop_la_rehabilitadora, 0) + COALESCE(NEW.coop_virgen_las_nieves, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_empleados_contrato_provisional_trg ON public.empleados_contrato_provisional;
CREATE TRIGGER calc_totales_empleados_contrato_provisional_trg
  BEFORE INSERT OR UPDATE ON public.empleados_contrato_provisional
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_empleados_contrato_provisional();


-- empleados_mandato_judicial_24041
CREATE OR REPLACE FUNCTION public.calc_totales_empleados_mandato_judicial_24041()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.rem_cont, 0) + COALESCE(NEW.inc_neg_col_ds314_23, 0) + COALESCE(NEW.inc_neg_col_ds268_24, 0) + COALESCE(NEW.inc_neg_col_ds280_24, 0) + COALESCE(NEW.inc_neg_col_ds326_25, 0) + COALESCE(NEW.reintegro, 0) + COALESCE(NEW.ref, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_m_magd, 0) + COALESCE(NEW.desc_var, 0) + COALESCE(NEW.seguro_fe_salud, 0) + COALESCE(NEW.banco_pichincha, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.coop_la_rehabilitadora, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_empleados_mandato_judicial_24041_trg ON public.empleados_mandato_judicial_24041;
CREATE TRIGGER calc_totales_empleados_mandato_judicial_24041_trg
  BEFORE INSERT OR UPDATE ON public.empleados_mandato_judicial_24041
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_empleados_mandato_judicial_24041();


-- cas_general
CREATE OR REPLACE FUNCTION public.calc_totales_cas_general()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.retrib_contr, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_2023_ef, 0) + COALESCE(NEW.ds265_2024ef, 0) + COALESCE(NEW.ds279_2024ef, 0) + COALESCE(NEW.ds327_2025ef, 0) + COALESCE(NEW.ref, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_cas_general_trg ON public.cas_general;
CREATE TRIGGER calc_totales_cas_general_trg
  BEFORE INSERT OR UPDATE ON public.cas_general
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_cas_general();


-- cas_choferes
CREATE OR REPLACE FUNCTION public.calc_totales_cas_choferes()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.retrib_contr, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_2023_ef, 0) + COALESCE(NEW.ds265_2024ef, 0) + COALESCE(NEW.ds279_2024ef, 0) + COALESCE(NEW.ds327_2025ef, 0) + COALESCE(NEW.ref, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_cas_choferes_trg ON public.cas_choferes;
CREATE TRIGGER calc_totales_cas_choferes_trg
  BEFORE INSERT OR UPDATE ON public.cas_choferes
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_cas_choferes();


-- cas_i_2025
CREATE OR REPLACE FUNCTION public.calc_totales_cas_i_2025()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.retrib_contr, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_2023_ef, 0) + COALESCE(NEW.ds265_2024ef, 0) + COALESCE(NEW.ds279_2024ef, 0) + COALESCE(NEW.ds327_2025ef, 0) + COALESCE(NEW.ref, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_cas_i_2025_trg ON public.cas_i_2025;
CREATE TRIGGER calc_totales_cas_i_2025_trg
  BEFORE INSERT OR UPDATE ON public.cas_i_2025
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_cas_i_2025();


-- cas_ii_2023
CREATE OR REPLACE FUNCTION public.calc_totales_cas_ii_2023()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.retrib_contr, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_2023_ef, 0) + COALESCE(NEW.ds265_2024ef, 0) + COALESCE(NEW.ds279_2024ef, 0) + COALESCE(NEW.ds327_2025ef, 0) + COALESCE(NEW.ref, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_cas_ii_2023_trg ON public.cas_ii_2023;
CREATE TRIGGER calc_totales_cas_ii_2023_trg
  BEFORE INSERT OR UPDATE ON public.cas_ii_2023
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_cas_ii_2023();


-- cas_ii_2024
CREATE OR REPLACE FUNCTION public.calc_totales_cas_ii_2024()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.retrib_contr, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_2023_ef, 0) + COALESCE(NEW.ds265_2024ef, 0) + COALESCE(NEW.ds279_2024ef, 0) + COALESCE(NEW.ds327_2025ef, 0) + COALESCE(NEW.ref, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_cas_ii_2024_trg ON public.cas_ii_2024;
CREATE TRIGGER calc_totales_cas_ii_2024_trg
  BEFORE INSERT OR UPDATE ON public.cas_ii_2024
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_cas_ii_2024();


-- cas_iii_2025
CREATE OR REPLACE FUNCTION public.calc_totales_cas_iii_2025()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.retrib_contr, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_2023_ef, 0) + COALESCE(NEW.ds265_2024ef, 0) + COALESCE(NEW.ds279_2024ef, 0) + COALESCE(NEW.ds327_2025ef, 0) + COALESCE(NEW.ref, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_cas_iii_2025_trg ON public.cas_iii_2025;
CREATE TRIGGER calc_totales_cas_iii_2025_trg
  BEFORE INSERT OR UPDATE ON public.cas_iii_2025
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_cas_iii_2025();


-- cas_funcional
CREATE OR REPLACE FUNCTION public.calc_totales_cas_funcional()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.retrib_contr, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_2023_ef, 0) + COALESCE(NEW.ds265_2024ef, 0) + COALESCE(NEW.ds279_2024ef, 0) + COALESCE(NEW.ds327_2025ef, 0) + COALESCE(NEW.ref, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_cas_funcional_trg ON public.cas_funcional;
CREATE TRIGGER calc_totales_cas_funcional_trg
  BEFORE INSERT OR UPDATE ON public.cas_funcional
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_cas_funcional();


-- cesantes_pensionistas
CREATE OR REPLACE FUNCTION public.calc_totales_cesantes_pensionistas()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.rem_bas, 0) + COALESCE(NEW.rem_r, 0) + COALESCE(NEW.pens_viudez_rmv, 0) + COALESCE(NEW.art18_dl20530, 0) + COALESCE(NEW.bonif_pers, 0) + COALESCE(NEW.ds_276, 0) + COALESCE(NEW.costo_v_acumul_p_viud_ra, 0) + COALESCE(NEW.bonif_fam, 0) + COALESCE(NEW.ds16_06_1_74, 0) + COALESCE(NEW.acumulado_ds039_07_al_ds011_18, 0) + COALESCE(NEW.ds_009_19, 0) + COALESCE(NEW.ds_006_20, 0) + COALESCE(NEW.ds_006_21, 0) + COALESCE(NEW.ds_014_22, 0) + COALESCE(NEW.ds_007_23, 0) + COALESCE(NEW.ds_002_24, 0) + COALESCE(NEW.ds_003_25, 0) + COALESCE(NEW.reintegro_rem, 0) + COALESCE(NEW.ds_009_2026_ef, 0) + COALESCE(NEW.ref_mov, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.ss, 0) + COALESCE(NEW.otros, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_ac_sta_mm, 0) + COALESCE(NEW.coop_ac_san_ch, 0) + COALESCE(NEW.dscto_aut_ascejumi, 0) + COALESCE(NEW.ascejumi, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_cesantes_pensionistas_trg ON public.cesantes_pensionistas;
CREATE TRIGGER calc_totales_cesantes_pensionistas_trg
  BEFORE INSERT OR UPDATE ON public.cesantes_pensionistas
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_cesantes_pensionistas();


-- gerente_municipal
CREATE OR REPLACE FUNCTION public.calc_totales_gerente_municipal()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.ds_413_19_ef, 0) + COALESCE(NEW.otros_r, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.fdo_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.d_aut_sit_mpi, 0) + COALESCE(NEW.dscto_otros, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ccp, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.dscto_aut_varios, 0) + COALESCE(NEW.coop_m_magd, 0) + COALESCE(NEW.la_positiva_vida, 0) + COALESCE(NEW.cep, 0) + COALESCE(NEW.c_sind_sit_mpi, 0) + COALESCE(NEW.clap, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_gerente_municipal_trg ON public.gerente_municipal;
CREATE TRIGGER calc_totales_gerente_municipal_trg
  BEFORE INSERT OR UPDATE ON public.gerente_municipal
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_gerente_municipal();


-- alcalde
CREATE OR REPLACE FUNCTION public.calc_totales_alcalde()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.ds_413_19_ef, 0) + COALESCE(NEW.otros_r, 0) + COALESCE(NEW.inc_neg_col_ds314_23, 0) + COALESCE(NEW.inc_neg_col_ds268_24, 0) + COALESCE(NEW.inc_neg_col_ds280_24, 0) + COALESCE(NEW.inc_neg_col_ds326_25, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.snp, 0) + COALESCE(NEW.fdo_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.d_aut_sit_mpi, 0) + COALESCE(NEW.dscto_otros, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ccp, 0) + COALESCE(NEW.faltas_tarda, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.dscto_aut_varios, 0) + COALESCE(NEW.la_positiva_vida, 0) + COALESCE(NEW.cep, 0) + COALESCE(NEW.c_sind_sit_mpi, 0) + COALESCE(NEW.clap, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_alcalde_trg ON public.alcalde;
CREATE TRIGGER calc_totales_alcalde_trg
  BEFORE INSERT OR UPDATE ON public.alcalde
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_alcalde();
