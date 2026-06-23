-- ================================================================
-- 03_tablas.sql  —  Generado automáticamente por scripts/genSql.mjs
-- NO editar a mano: editar src/config/planillas.js y regenerar
-- ================================================================


-- ════════════════════════════════════════
-- obreros_permanentes
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.obreros_permanentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  f_ingreso DATE,
  dias_lab INTEGER,
  afil_a TEXT,
  rem_bas NUMERIC(12,2),
  rem NUMERIC(12,2),
  cv_historial NUMERIC(12,2),
  b_famil NUMERIC(12,2),
  p_pacto NUMERIC(12,2),
  mov_p2014 NUMERIC(12,2),
  pacto_2013 NUMERIC(12,2),
  pacto_2014 NUMERIC(12,2),
  laudo_2019 NUMERIC(12,2),
  inc_3_3 NUMERIC(12,2),
  inc_10_23 NUMERIC(12,2),
  inc_3 NUMERIC(12,2),
  otros NUMERIC(12,2),
  riesgo_salud NUMERIC(12,2),
  neg_col_ds311_22 NUMERIC(12,2),
  neg_col_ds265_24 NUMERIC(12,2),
  neg_col_ds279_24 NUMERIC(12,2),
  neg_col_ds325_25 NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  ref_mov_laudo_2019 NUMERIC(12,2),
  ref_pacto_2014 NUMERIC(12,2),
  asig_fam_10rmv NUMERIC(12,2),
  ref_mov_histor NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  reunif NUMERIC(12,2),
  fdo_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  positiva_vida NUMERIC(12,2),
  c_var NUMERIC(12,2),
  rimac_seg NUMERIC(12,2),
  coop_san_ch NUMERIC(12,2),
  coop_san_miguel NUMERIC(12,2),
  coop_rehabilita NUMERIC(12,2),
  dscto_autoriz_ii NUMERIC(12,2),
  faltas INTEGER,
  ret_jud NUMERIC(12,2),
  pichincha NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  fesalud NUMERIC(12,2),
  dscto_somun NUMERIC(12,2),
  coop_virgen_n NUMERIC(12,2),
  coop_sta_mm NUMERIC(12,2),
  rta_5ta_cat NUMERIC(12,2),
  c_sindical NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_obreros_permanentes
  BEFORE UPDATE ON public.obreros_permanentes
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- obreros_plazo_indeterminado
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.obreros_plazo_indeterminado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  dias_lab INTEGER,
  afil_a TEXT,
  r_basica NUMERIC(12,2),
  r_reunif NUMERIC(12,2),
  mov_p2014 NUMERIC(12,2),
  p_pacto NUMERIC(12,2),
  inc_anc10_m038_11_rh NUMERIC(12,2),
  rem_cont_plazo_indet NUMERIC(12,2),
  pacto_2013 NUMERIC(12,2),
  pacto_2014 NUMERIC(12,2),
  laudo_2019 NUMERIC(12,2),
  inc_rmv_ds016_05 NUMERIC(12,2),
  inc_rmv_ds022_07 NUMERIC(12,2),
  inc_anc_mem005_09 NUMERIC(12,2),
  niv_fe_errat_rga002_16 NUMERIC(12,2),
  ref_pacto_2014 NUMERIC(12,2),
  ref_mov_laudo_2019 NUMERIC(12,2),
  asig_fam_10rmv NUMERIC(12,2),
  conv_col_ds325_25 NUMERIC(12,2),
  conv_col_ds265_24 NUMERIC(12,2),
  conv_col_ds279_24 NUMERIC(12,2),
  neg_col_ds313_23 NUMERIC(12,2),
  conv_col_ds311_22 NUMERIC(12,2),
  riesgo_salud NUMERIC(12,2),
  ref_mov_98_ra005_22 NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  positiva_vida NUMERIC(12,2),
  rimac_seg NUMERIC(12,2),
  pichincha NUMERIC(12,2),
  coop_san_miguel NUMERIC(12,2),
  coop_rehabilita NUMERIC(12,2),
  renta_5ta_cat NUMERIC(12,2),
  faltas INTEGER,
  r_jud NUMERIC(12,2),
  interseguro NUMERIC(12,2),
  somun NUMERIC(12,2),
  coop_virgen_n NUMERIC(12,2),
  coop_sta_mm NUMERIC(12,2),
  fesalud NUMERIC(12,2),
  coop_san_ch NUMERIC(12,2),
  c_sind NUMERIC(12,2),
  dscto_autoriz NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_obreros_plazo_indeterminado
  BEFORE UPDATE ON public.obreros_plazo_indeterminado
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- obreros_mandato_judicial
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.obreros_mandato_judicial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  dias_lab INTEGER,
  afil_a TEXT,
  rem_cont_plazo_indet NUMERIC(12,2),
  neg_col_ds313_23 NUMERIC(12,2),
  riesgo_salud NUMERIC(12,2),
  asig_fam_10rmv NUMERIC(12,2),
  conv_col_ds265_24 NUMERIC(12,2),
  conv_col_ds279_24 NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  conv_col_ds325_25 NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  rimac_seg NUMERIC(12,2),
  coop_san_miguel NUMERIC(12,2),
  coop_rehabilita NUMERIC(12,2),
  renta_5ta_cat NUMERIC(12,2),
  faltas INTEGER,
  r_jud NUMERIC(12,2),
  pichincha NUMERIC(12,2),
  somun NUMERIC(12,2),
  coop_sta_mm NUMERIC(12,2),
  fesalud NUMERIC(12,2),
  coop_san_ch NUMERIC(12,2),
  c_sind NUMERIC(12,2),
  dscto_ii NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_obreros_mandato_judicial
  BEFORE UPDATE ON public.obreros_mandato_judicial
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- obreros_concurso
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.obreros_concurso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  dias_lab INTEGER,
  afil_a TEXT,
  r_basica NUMERIC(12,2),
  rem_reunificada NUMERIC(12,2),
  rem_cont_plazo_indet NUMERIC(12,2),
  ref_mov_ra1596_98_ampi NUMERIC(12,2),
  bonif_riesgo_salud_10 NUMERIC(12,2),
  otros_personal_servicio NUMERIC(12,2),
  subv_financ_laudo_2014 NUMERIC(12,2),
  ds311_2022_ef NUMERIC(12,2),
  ds313_23_ef NUMERIC(12,2),
  ds265_24_ef NUMERIC(12,2),
  asig_fam NUMERIC(12,2),
  neg_col_ctral_2024_2025 NUMERIC(12,2),
  neg_col_ctral_2025_2026 NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  costo_vida_laudo_2019 NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  comis_variable NUMERIC(12,2),
  inasistencias INTEGER,
  retenc_judicial NUMERIC(12,2),
  rimac NUMERIC(12,2),
  cuota_sindical NUMERIC(12,2),
  coop_la_rehabilitadora NUMERIC(12,2),
  coop_san_miguel NUMERIC(12,2),
  coop_san_cristobal NUMERIC(12,2),
  coop_virgen_las_nieves NUMERIC(12,2),
  otros_r_dtos NUMERIC(12,2),
  dscto_ii NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_obreros_concurso
  BEFORE UPDATE ON public.obreros_concurso
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- obreros_necesidad_mercado
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.obreros_necesidad_mercado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  dias_lab INTEGER,
  afil_a TEXT,
  t_ingreso NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_obreros_necesidad_mercado
  BEFORE UPDATE ON public.obreros_necesidad_mercado
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- empleados_permanentes
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.empleados_permanentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  cargo TEXT,
  vacaciones NUMERIC(12,2),
  niv_rem TEXT,
  afp TEXT,
  r_basica NUMERIC(12,2),
  r_reunif NUMERIC(12,2),
  b_familiar NUMERIC(12,2),
  b_pers NUMERIC(12,2),
  inc_neg_col_ds320_22 NUMERIC(12,2),
  memo_159_2025_ogrrhh_mpi NUMERIC(12,2),
  c_vida_tph NUMERIC(12,2),
  reaj_c_vida_10 NUMERIC(12,2),
  reaj_c_vida_7 NUMERIC(12,2),
  inc_neg_col_ds314_23 NUMERIC(12,2),
  inc_neg_col_ds268_24 NUMERIC(12,2),
  inc_neg_col_ds280_24 NUMERIC(12,2),
  m_jud_inc_ref_mov NUMERIC(12,2),
  inc_neg_col_ds326_25 NUMERIC(12,2),
  inc_3_3 NUMERIC(12,2),
  inc_10_23 NUMERIC(12,2),
  inc_3 NUMERIC(12,2),
  bonif_dif NUMERIC(12,2),
  reinteg NUMERIC(12,2),
  ref_mov NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  fdo_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  ir_5ta_cat NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  seg_rimac NUMERIC(12,2),
  interseguro NUMERIC(12,2),
  coop_la_rehabilitad NUMERIC(12,2),
  bco_pichincha NUMERIC(12,2),
  coop_s_cristobal NUMERIC(12,2),
  ccp NUMERIC(12,2),
  faltas INTEGER,
  ret_jud NUMERIC(12,2),
  fe_salud NUMERIC(12,2),
  dsct_autorizado NUMERIC(12,2),
  coop_maria_magdalena NUMERIC(12,2),
  la_positiva_vida NUMERIC(12,2),
  coop_san_miguel NUMERIC(12,2),
  cuota_sindical NUMERIC(12,2),
  coop_virgen_nieves NUMERIC(12,2),
  descuento_sitramun NUMERIC(12,2),
  regularizacion NUMERIC(12,2),
  clap NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_empleados_permanentes
  BEFORE UPDATE ON public.empleados_permanentes
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- empleados_contrato_plazo_indet
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.empleados_contrato_plazo_indet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  cargo TEXT,
  afil_a TEXT,
  rem_cont NUMERIC(12,2),
  neg_cent_2024 NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  inc_neg_col_ds314_23 NUMERIC(12,2),
  inc_neg_col_ds268_24 NUMERIC(12,2),
  inc_neg_col_ds280_24 NUMERIC(12,2),
  inc_neg_col_ds326_25 NUMERIC(12,2),
  reintegro NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  ir_5ta_cat NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  seg_rimac NUMERIC(12,2),
  interseguro NUMERIC(12,2),
  coop_s_crist NUMERIC(12,2),
  faltas INTEGER,
  ret_jud NUMERIC(12,2),
  coop_san_miguel NUMERIC(12,2),
  coop_m_magd NUMERIC(12,2),
  desc_var NUMERIC(12,2),
  seguro_fe_salud NUMERIC(12,2),
  banco_pichincha NUMERIC(12,2),
  fe_salud NUMERIC(12,2),
  coop_la_rehabilitadora NUMERIC(12,2),
  coop_virgen_las_nieves NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_empleados_contrato_plazo_indet
  BEFORE UPDATE ON public.empleados_contrato_plazo_indet
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- empleados_contrato_provisional
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.empleados_contrato_provisional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  cargo TEXT,
  afil_a TEXT,
  rem_cont NUMERIC(12,2),
  neg_cent_2024 NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  inc_neg_col_ds314_23 NUMERIC(12,2),
  inc_neg_col_ds268_24 NUMERIC(12,2),
  inc_neg_col_ds280_24 NUMERIC(12,2),
  inc_neg_col_ds326_25 NUMERIC(12,2),
  reintegro NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  ir_5ta_cat NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  seg_rimac NUMERIC(12,2),
  interseguro NUMERIC(12,2),
  coop_s_crist NUMERIC(12,2),
  faltas INTEGER,
  ret_jud NUMERIC(12,2),
  coop_san_miguel NUMERIC(12,2),
  coop_m_magd NUMERIC(12,2),
  desc_var NUMERIC(12,2),
  seguro_fe_salud NUMERIC(12,2),
  banco_pichincha NUMERIC(12,2),
  fe_salud NUMERIC(12,2),
  coop_la_rehabilitadora NUMERIC(12,2),
  coop_virgen_las_nieves NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_empleados_contrato_provisional
  BEFORE UPDATE ON public.empleados_contrato_provisional
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- empleados_mandato_judicial_24041
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.empleados_mandato_judicial_24041 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  cargo TEXT,
  afil_a TEXT,
  rem_cont NUMERIC(12,2),
  inc_neg_col_ds314_23 NUMERIC(12,2),
  inc_neg_col_ds268_24 NUMERIC(12,2),
  inc_neg_col_ds280_24 NUMERIC(12,2),
  inc_neg_col_ds326_25 NUMERIC(12,2),
  reintegro NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  ir_5ta_cat NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  seg_rimac NUMERIC(12,2),
  interseguro NUMERIC(12,2),
  coop_s_crist NUMERIC(12,2),
  faltas INTEGER,
  ret_jud NUMERIC(12,2),
  coop_san_miguel NUMERIC(12,2),
  coop_m_magd NUMERIC(12,2),
  desc_var NUMERIC(12,2),
  seguro_fe_salud NUMERIC(12,2),
  banco_pichincha NUMERIC(12,2),
  fe_salud NUMERIC(12,2),
  coop_la_rehabilitadora NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_empleados_mandato_judicial_24041
  BEFORE UPDATE ON public.empleados_mandato_judicial_24041
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- cas_general
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cas_general (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  faltas INTEGER,
  cargo TEXT,
  afil_a TEXT,
  r_basica NUMERIC(12,2),
  r_reunif NUMERIC(12,2),
  retrib_contr NUMERIC(12,2),
  inc_10_23 NUMERIC(12,2),
  inc_3 NUMERIC(12,2),
  ds311_2022_ef NUMERIC(12,2),
  ds313_2023_ef NUMERIC(12,2),
  ds265_2024ef NUMERIC(12,2),
  ds279_2024ef NUMERIC(12,2),
  ds327_2025ef NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  coop_la_rehab NUMERIC(12,2),
  dscto_fesalud NUMERIC(12,2),
  rimac_seg NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  la_positiva_seguros NUMERIC(12,2),
  r_jud NUMERIC(12,2),
  coop_san_ch NUMERIC(12,2),
  ret_4ta_categ NUMERIC(12,2),
  cop_nieves NUMERIC(12,2),
  san_miguel NUMERIC(12,2),
  coop_sta_mm NUMERIC(12,2),
  c_sind NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  firma TEXT,
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_cas_general
  BEFORE UPDATE ON public.cas_general
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- cas_choferes
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cas_choferes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  faltas INTEGER,
  cargo TEXT,
  afil_a TEXT,
  r_basica NUMERIC(12,2),
  r_reunif NUMERIC(12,2),
  retrib_contr NUMERIC(12,2),
  inc_10_23 NUMERIC(12,2),
  inc_3 NUMERIC(12,2),
  ds311_2022_ef NUMERIC(12,2),
  ds313_2023_ef NUMERIC(12,2),
  ds265_2024ef NUMERIC(12,2),
  ds279_2024ef NUMERIC(12,2),
  ds327_2025ef NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  coop_la_rehab NUMERIC(12,2),
  dscto_fesalud NUMERIC(12,2),
  rimac_seg NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  la_positiva_seguros NUMERIC(12,2),
  r_jud NUMERIC(12,2),
  coop_san_ch NUMERIC(12,2),
  ret_4ta_categ NUMERIC(12,2),
  cop_nieves NUMERIC(12,2),
  san_miguel NUMERIC(12,2),
  coop_sta_mm NUMERIC(12,2),
  c_sind NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  firma TEXT,
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_cas_choferes
  BEFORE UPDATE ON public.cas_choferes
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- cas_i_2025
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cas_i_2025 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  faltas INTEGER,
  cargo TEXT,
  afil_a TEXT,
  r_basica NUMERIC(12,2),
  r_reunif NUMERIC(12,2),
  retrib_contr NUMERIC(12,2),
  inc_10_23 NUMERIC(12,2),
  inc_3 NUMERIC(12,2),
  ds311_2022_ef NUMERIC(12,2),
  ds313_2023_ef NUMERIC(12,2),
  ds265_2024ef NUMERIC(12,2),
  ds279_2024ef NUMERIC(12,2),
  ds327_2025ef NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  coop_la_rehab NUMERIC(12,2),
  dscto_fesalud NUMERIC(12,2),
  rimac_seg NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  la_positiva_seguros NUMERIC(12,2),
  r_jud NUMERIC(12,2),
  coop_san_ch NUMERIC(12,2),
  ret_4ta_categ NUMERIC(12,2),
  cop_nieves NUMERIC(12,2),
  san_miguel NUMERIC(12,2),
  coop_sta_mm NUMERIC(12,2),
  c_sind NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  firma TEXT,
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_cas_i_2025
  BEFORE UPDATE ON public.cas_i_2025
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- cas_ii_2023
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cas_ii_2023 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  faltas INTEGER,
  cargo TEXT,
  afil_a TEXT,
  r_basica NUMERIC(12,2),
  r_reunif NUMERIC(12,2),
  retrib_contr NUMERIC(12,2),
  inc_10_23 NUMERIC(12,2),
  inc_3 NUMERIC(12,2),
  ds311_2022_ef NUMERIC(12,2),
  ds313_2023_ef NUMERIC(12,2),
  ds265_2024ef NUMERIC(12,2),
  ds279_2024ef NUMERIC(12,2),
  ds327_2025ef NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  coop_la_rehab NUMERIC(12,2),
  dscto_fesalud NUMERIC(12,2),
  rimac_seg NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  la_positiva_seguros NUMERIC(12,2),
  r_jud NUMERIC(12,2),
  coop_san_ch NUMERIC(12,2),
  ret_4ta_categ NUMERIC(12,2),
  cop_nieves NUMERIC(12,2),
  san_miguel NUMERIC(12,2),
  coop_sta_mm NUMERIC(12,2),
  c_sind NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  firma TEXT,
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_cas_ii_2023
  BEFORE UPDATE ON public.cas_ii_2023
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- cas_ii_2024
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cas_ii_2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  faltas INTEGER,
  cargo TEXT,
  afil_a TEXT,
  r_basica NUMERIC(12,2),
  r_reunif NUMERIC(12,2),
  retrib_contr NUMERIC(12,2),
  inc_10_23 NUMERIC(12,2),
  inc_3 NUMERIC(12,2),
  ds311_2022_ef NUMERIC(12,2),
  ds313_2023_ef NUMERIC(12,2),
  ds265_2024ef NUMERIC(12,2),
  ds279_2024ef NUMERIC(12,2),
  ds327_2025ef NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  coop_la_rehab NUMERIC(12,2),
  dscto_fesalud NUMERIC(12,2),
  rimac_seg NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  la_positiva_seguros NUMERIC(12,2),
  r_jud NUMERIC(12,2),
  coop_san_ch NUMERIC(12,2),
  ret_4ta_categ NUMERIC(12,2),
  cop_nieves NUMERIC(12,2),
  san_miguel NUMERIC(12,2),
  coop_sta_mm NUMERIC(12,2),
  c_sind NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  firma TEXT,
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_cas_ii_2024
  BEFORE UPDATE ON public.cas_ii_2024
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- cas_iii_2025
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cas_iii_2025 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  faltas INTEGER,
  cargo TEXT,
  afil_a TEXT,
  r_basica NUMERIC(12,2),
  r_reunif NUMERIC(12,2),
  retrib_contr NUMERIC(12,2),
  inc_10_23 NUMERIC(12,2),
  inc_3 NUMERIC(12,2),
  ds311_2022_ef NUMERIC(12,2),
  ds313_2023_ef NUMERIC(12,2),
  ds265_2024ef NUMERIC(12,2),
  ds279_2024ef NUMERIC(12,2),
  ds327_2025ef NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  coop_la_rehab NUMERIC(12,2),
  dscto_fesalud NUMERIC(12,2),
  rimac_seg NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  la_positiva_seguros NUMERIC(12,2),
  r_jud NUMERIC(12,2),
  coop_san_ch NUMERIC(12,2),
  ret_4ta_categ NUMERIC(12,2),
  cop_nieves NUMERIC(12,2),
  san_miguel NUMERIC(12,2),
  coop_sta_mm NUMERIC(12,2),
  c_sind NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  firma TEXT,
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_cas_iii_2025
  BEFORE UPDATE ON public.cas_iii_2025
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- cas_funcional
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cas_funcional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  faltas INTEGER,
  cargo TEXT,
  afil_a TEXT,
  r_basica NUMERIC(12,2),
  r_reunif NUMERIC(12,2),
  retrib_contr NUMERIC(12,2),
  inc_10_23 NUMERIC(12,2),
  inc_3 NUMERIC(12,2),
  ds311_2022_ef NUMERIC(12,2),
  ds313_2023_ef NUMERIC(12,2),
  ds265_2024ef NUMERIC(12,2),
  ds279_2024ef NUMERIC(12,2),
  ds327_2025ef NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  f_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  coop_la_rehab NUMERIC(12,2),
  dscto_fesalud NUMERIC(12,2),
  rimac_seg NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  la_positiva_seguros NUMERIC(12,2),
  r_jud NUMERIC(12,2),
  coop_san_ch NUMERIC(12,2),
  ret_4ta_categ NUMERIC(12,2),
  cop_nieves NUMERIC(12,2),
  san_miguel NUMERIC(12,2),
  coop_sta_mm NUMERIC(12,2),
  c_sind NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  firma TEXT,
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_cas_funcional
  BEFORE UPDATE ON public.cas_funcional
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- cesantes_pensionistas
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cesantes_pensionistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  nivel TEXT,
  rem_bas NUMERIC(12,2),
  rem_r NUMERIC(12,2),
  pens_viudez_rmv NUMERIC(12,2),
  art18_dl20530 NUMERIC(12,2),
  bonif_pers NUMERIC(12,2),
  ds_276 NUMERIC(12,2),
  costo_v_acumul_p_viud_ra NUMERIC(12,2),
  bonif_fam NUMERIC(12,2),
  ds16_06_1_74 NUMERIC(12,2),
  acumulado_ds039_07_al_ds011_18 NUMERIC(12,2),
  ds_009_19 NUMERIC(12,2),
  ds_006_20 NUMERIC(12,2),
  ds_006_21 NUMERIC(12,2),
  ds_014_22 NUMERIC(12,2),
  ds_007_23 NUMERIC(12,2),
  ds_002_24 NUMERIC(12,2),
  ds_003_25 NUMERIC(12,2),
  reintegro_rem NUMERIC(12,2),
  ds_009_2026_ef NUMERIC(12,2),
  ref_mov NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  ss NUMERIC(12,2),
  otros NUMERIC(12,2),
  ret_jud NUMERIC(12,2),
  coop_san_miguel NUMERIC(12,2),
  coop_ac_sta_mm NUMERIC(12,2),
  coop_ac_san_ch NUMERIC(12,2),
  dscto_aut_ascejumi NUMERIC(12,2),
  ascejumi NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  firma TEXT,
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_cesantes_pensionistas
  BEFORE UPDATE ON public.cesantes_pensionistas
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- gerente_municipal
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.gerente_municipal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  fecha_ing DATE,
  cargo TEXT,
  faltas INTEGER,
  afil_a TEXT,
  ds_413_19_ef NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  snp NUMERIC(12,2),
  fdo_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  ir_5ta_cat NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  seg_rimac NUMERIC(12,2),
  interseguro NUMERIC(12,2),
  d_aut_sit_mpi NUMERIC(12,2),
  dscto_otros NUMERIC(12,2),
  coop_s_crist NUMERIC(12,2),
  ccp NUMERIC(12,2),
  ret_jud NUMERIC(12,2),
  dscto_aut_varios NUMERIC(12,2),
  coop_m_magd NUMERIC(12,2),
  la_positiva_vida NUMERIC(12,2),
  cep NUMERIC(12,2),
  c_sind_sit_mpi NUMERIC(12,2),
  clap NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  firma TEXT,
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_gerente_municipal
  BEFORE UPDATE ON public.gerente_municipal
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- ════════════════════════════════════════
-- alcalde
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.alcalde (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dni INTEGER UNIQUE NOT NULL,
  apellidos_y_nombres TEXT NOT NULL,
  cargo TEXT,
  fecha_ing DATE,
  faltas INTEGER,
  niv_rem TEXT,
  afp TEXT,
  ds_413_19_ef NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  inc_neg_col_ds314_23 NUMERIC(12,2),
  inc_neg_col_ds268_24 NUMERIC(12,2),
  inc_neg_col_ds280_24 NUMERIC(12,2),
  inc_neg_col_ds326_25 NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  base NUMERIC(12,2),
  snp NUMERIC(12,2),
  fdo_pens NUMERIC(12,2),
  p_seg NUMERIC(12,2),
  c_var NUMERIC(12,2),
  ir_5ta_cat NUMERIC(12,2),
  mas_vida NUMERIC(12,2),
  seg_rimac NUMERIC(12,2),
  interseguro NUMERIC(12,2),
  d_aut_sit_mpi NUMERIC(12,2),
  dscto_otros NUMERIC(12,2),
  coop_s_crist NUMERIC(12,2),
  ccp NUMERIC(12,2),
  faltas_tarda NUMERIC(12,2),
  ret_jud NUMERIC(12,2),
  dscto_aut_varios NUMERIC(12,2),
  la_positiva_vida NUMERIC(12,2),
  cep NUMERIC(12,2),
  c_sind_sit_mpi NUMERIC(12,2),
  clap NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  firma TEXT,
  observaciones TEXT
);

CREATE TRIGGER handle_updated_at_alcalde
  BEFORE UPDATE ON public.alcalde
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
