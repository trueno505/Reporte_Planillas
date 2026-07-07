-- =====================================================================
-- MIGRACIÓN COMPLETA — Muni Sheets
-- Pega TODO este archivo en el SQL Editor de Supabase y ejecútalo una vez.
-- Generado concatenando 01..13 en orden.
-- =====================================================================



-- =====================================================================
-- 01_extensions.sql
-- =====================================================================

-- 01_extensions.sql
-- Extensiones requeridas por el proyecto

-- Actualiza automáticamente la columna updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Búsqueda por similitud / ILIKE acelerada con índices GIN (ver 10_indices.sql)
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- =====================================================================
-- 02_perfiles.sql
-- =====================================================================

-- 02_perfiles.sql
-- Tabla de perfiles de usuario vinculada a auth.users

CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT,
  celular TEXT,
  rol TEXT NOT NULL DEFAULT 'consultor' CHECK (rol IN ('consultor', 'editor', 'administrador')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Por si la tabla ya existía sin la columna (instalaciones previas):
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS celular TEXT;

-- Trigger: crear perfil automáticamente al registrar un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    'consultor'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =====================================================================
-- 03_tablas.sql
-- =====================================================================

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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
  rem_cont_plazo_indet NUMERIC(12,2),
  neg_col_ds313_23 NUMERIC(12,2),
  riesgo_salud NUMERIC(12,2),
  asig_fam_10rmv NUMERIC(12,2),
  conv_col_ds265_24 NUMERIC(12,2),
  conv_col_ds279_24 NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  conv_col_ds325_25 NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
  t_ingreso NUMERIC(12,2),
  t_dsctos NUMERIC(12,2),
  t_liquido NUMERIC(12,2),
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
  rem_cont NUMERIC(12,2),
  inc_neg_col_ds314_23 NUMERIC(12,2),
  inc_neg_col_ds268_24 NUMERIC(12,2),
  inc_neg_col_ds280_24 NUMERIC(12,2),
  inc_neg_col_ds326_25 NUMERIC(12,2),
  reintegro NUMERIC(12,2),
  ref NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
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
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
  ds_413_19_ef NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
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
  snp TEXT,
  ds_413_19_ef NUMERIC(12,2),
  otros_r NUMERIC(12,2),
  inc_neg_col_ds314_23 NUMERIC(12,2),
  inc_neg_col_ds268_24 NUMERIC(12,2),
  inc_neg_col_ds280_24 NUMERIC(12,2),
  inc_neg_col_ds326_25 NUMERIC(12,2),
  t_ingreso NUMERIC(12,2),
  base NUMERIC(12,2),
  descuento_snp NUMERIC(12,2),
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
  tipo_acto_administrativo TEXT
);

CREATE TRIGGER handle_updated_at_alcalde
  BEFORE UPDATE ON public.alcalde
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- =====================================================================
-- 04_rls.sql
-- =====================================================================

-- 04_rls.sql
-- Row Level Security para todas las tablas de planillas y perfiles

-- Función helper: obtiene el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_rol()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$;

-- ─── perfiles ───────────────────────────────────────────────────────────────
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfiles_select" ON public.perfiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "perfiles_update" ON public.perfiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()));

-- ─── Protección anti-escalada de privilegios ────────────────────────────────
-- La política de arriba deja que un usuario edite su propia fila (nombre,
-- celular). Este trigger impide que un NO-administrador cambie su propio `rol`:
-- si lo intenta, el cambio se revierte silenciosamente. Solo un administrador
-- puede modificar roles (su propio rol o el de otros).
CREATE OR REPLACE FUNCTION public.proteger_rol_perfil()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.rol IS DISTINCT FROM OLD.rol
     AND (SELECT public.get_my_rol()) <> 'administrador' THEN
    NEW.rol := OLD.rol;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_rol ON public.perfiles;
CREATE TRIGGER proteger_rol
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_rol_perfil();

-- ─── Macro para aplicar políticas estándar en cada tabla de planilla ────────
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


-- =====================================================================
-- 05_realtime.sql
-- =====================================================================

-- 05_realtime.sql
-- Habilitar Realtime en las 19 tablas de planillas

ALTER TABLE public.obreros_permanentes           REPLICA IDENTITY FULL;
ALTER TABLE public.obreros_plazo_indeterminado   REPLICA IDENTITY FULL;
ALTER TABLE public.obreros_mandato_judicial      REPLICA IDENTITY FULL;
ALTER TABLE public.obreros_concurso              REPLICA IDENTITY FULL;
ALTER TABLE public.obreros_necesidad_mercado     REPLICA IDENTITY FULL;
ALTER TABLE public.empleados_permanentes         REPLICA IDENTITY FULL;
ALTER TABLE public.empleados_contrato_plazo_indet REPLICA IDENTITY FULL;
ALTER TABLE public.empleados_contrato_provisional REPLICA IDENTITY FULL;
ALTER TABLE public.empleados_mandato_judicial_24041 REPLICA IDENTITY FULL;
ALTER TABLE public.cas_general                   REPLICA IDENTITY FULL;
ALTER TABLE public.cas_choferes                  REPLICA IDENTITY FULL;
ALTER TABLE public.cas_i_2025                    REPLICA IDENTITY FULL;
ALTER TABLE public.cas_ii_2023                   REPLICA IDENTITY FULL;
ALTER TABLE public.cas_ii_2024                   REPLICA IDENTITY FULL;
ALTER TABLE public.cas_iii_2025                  REPLICA IDENTITY FULL;
ALTER TABLE public.cas_funcional                 REPLICA IDENTITY FULL;
ALTER TABLE public.cesantes_pensionistas         REPLICA IDENTITY FULL;
ALTER TABLE public.gerente_municipal             REPLICA IDENTITY FULL;
ALTER TABLE public.alcalde                       REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.obreros_permanentes,
  public.obreros_plazo_indeterminado,
  public.obreros_mandato_judicial,
  public.obreros_concurso,
  public.obreros_necesidad_mercado,
  public.empleados_permanentes,
  public.empleados_contrato_plazo_indet,
  public.empleados_contrato_provisional,
  public.empleados_mandato_judicial_24041,
  public.cas_general,
  public.cas_choferes,
  public.cas_i_2025,
  public.cas_ii_2023,
  public.cas_ii_2024,
  public.cas_iii_2025,
  public.cas_funcional,
  public.cesantes_pensionistas,
  public.gerente_municipal,
  public.alcalde;


-- =====================================================================
-- 06_auditoria.sql
-- =====================================================================

-- 06_auditoria.sql
-- Tabla de auditoría + triggers automáticos para las 19 planillas

CREATE TABLE IF NOT EXISTS public.auditoria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla       TEXT NOT NULL,
  registro_id UUID,
  accion      TEXT NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
  -- FK a public.perfiles (no a auth.users) para que PostgREST pueda embeber
  -- perfiles(nombre) en el SELECT de la página de Auditoría. perfiles.id es a
  -- su vez FK a auth.users.id, así que el valor es el mismo.
  usuario_id  UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  datos_ant   JSONB,
  datos_nue   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON public.auditoria(tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON public.auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria(created_at DESC);

-- RLS: solo administradores pueden ver el historial
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria_select_admin" ON public.auditoria
  FOR SELECT TO authenticated
  USING ((select get_my_rol()) = 'administrador');

-- Función trigger genérica
CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.auditoria (tabla, registro_id, accion, usuario_id, datos_ant, datos_nue)
  VALUES (
    TG_TABLE_NAME,
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    auth.uid(),
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NULL;
END;
$$;

-- Aplicar trigger a las 19 tablas
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','cas_choferes','cas_i_2025',
    'cas_ii_2023','cas_ii_2024','cas_iii_2025','cas_funcional',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS auditoria_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER auditoria_%s
       AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria()',
      t, t
    );
  END LOOP;
END;
$$;


-- =====================================================================
-- 07_funciones.sql
-- =====================================================================

-- 07_funciones.sql
-- RPCs: resumen de planillas y búsqueda global de trabajadores

-- ─── resumen_planillas ──────────────────────────────────────────────────────
-- Devuelve totales agregados por tabla en un solo viaje.
CREATE OR REPLACE FUNCTION public.resumen_planillas()
RETURNS TABLE (
  tabla        TEXT,
  n_registros  BIGINT,
  suma_ingreso NUMERIC,
  suma_dsctos  NUMERIC,
  suma_liquido NUMERIC
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT 'obreros_permanentes',           COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_permanentes
  UNION ALL
  SELECT 'obreros_plazo_indeterminado',   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_plazo_indeterminado
  UNION ALL
  SELECT 'obreros_mandato_judicial',      COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_mandato_judicial
  UNION ALL
  SELECT 'obreros_concurso',              COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_concurso
  UNION ALL
  SELECT 'obreros_necesidad_mercado',     COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_necesidad_mercado
  UNION ALL
  SELECT 'empleados_permanentes',         COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_permanentes
  UNION ALL
  SELECT 'empleados_contrato_plazo_indet',COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_plazo_indet
  UNION ALL
  SELECT 'empleados_contrato_provisional',COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_provisional
  UNION ALL
  SELECT 'empleados_mandato_judicial_24041',COUNT(*),COALESCE(SUM(t_ingreso),0),COALESCE(SUM(t_dsctos),0),COALESCE(SUM(t_liquido),0) FROM public.empleados_mandato_judicial_24041
  UNION ALL
  SELECT 'cas_general',                   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_general
  UNION ALL
  SELECT 'cas_choferes',                  COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_choferes
  UNION ALL
  SELECT 'cas_i_2025',                    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_i_2025
  UNION ALL
  SELECT 'cas_ii_2023',                   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_ii_2023
  UNION ALL
  SELECT 'cas_ii_2024',                   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_ii_2024
  UNION ALL
  SELECT 'cas_iii_2025',                  COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_iii_2025
  UNION ALL
  SELECT 'cas_funcional',                 COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_funcional
  UNION ALL
  SELECT 'cesantes_pensionistas',         COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cesantes_pensionistas
  UNION ALL
  SELECT 'gerente_municipal',             COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.gerente_municipal
  UNION ALL
  SELECT 'alcalde',                       COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.alcalde;
$$;

-- ─── buscar_trabajador ──────────────────────────────────────────────────────
-- Busca por DNI (=) o nombre (ILIKE) en las 19 tablas.
-- · Escapa los comodines de ILIKE (\, %, _) para que el texto se busque literal.
-- · Solo trata el término como DNI si son 1-9 dígitos (evita overflow de INTEGER).
CREATE OR REPLACE FUNCTION public.buscar_trabajador(termino TEXT)
RETURNS TABLE (tabla TEXT, slug TEXT, dni INTEGER, apellidos_y_nombres TEXT, t_liquido NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  patron  TEXT    := '%' || replace(replace(replace(termino, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  es_dni  BOOLEAN := termino ~ '^\d{1,9}$';
  dni_num INTEGER := CASE WHEN termino ~ '^\d{1,9}$' THEN termino::INTEGER ELSE NULL END;
BEGIN
  RETURN QUERY
  SELECT 'obreros_permanentes'::text, 'obreros-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_permanentes t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'obreros_plazo_indeterminado'::text, 'obreros-plazo-indeterminado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_plazo_indeterminado t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'obreros_mandato_judicial'::text, 'obreros-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_mandato_judicial t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'obreros_concurso'::text, 'obreros-concurso'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_concurso t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'obreros_necesidad_mercado'::text, 'obreros-necesidad-mercado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_necesidad_mercado t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'empleados_permanentes'::text, 'empleados-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_permanentes t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'empleados_contrato_plazo_indet'::text, 'empleados-contrato-plazo-indet'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_plazo_indet t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'empleados_contrato_provisional'::text, 'empleados-contrato-provisional'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_provisional t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'empleados_mandato_judicial_24041'::text, 'empleados-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_mandato_judicial_24041 t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_general'::text, 'cas-general'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_general t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_choferes'::text, 'cas-choferes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_choferes t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_i_2025'::text, 'cas-i-2025'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_i_2025 t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_ii_2023'::text, 'cas-ii-2023'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_ii_2023 t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_ii_2024'::text, 'cas-ii-2024'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_ii_2024 t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_iii_2025'::text, 'cas-iii-2025'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_iii_2025 t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cas_funcional'::text, 'cas-funcional'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_funcional t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'cesantes_pensionistas'::text, 'cesantes-pensionistas'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cesantes_pensionistas t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'gerente_municipal'::text, 'gerente-municipal'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.gerente_municipal t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  UNION ALL
  SELECT 'alcalde'::text, 'alcalde'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.alcalde t
    WHERE (es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron
  ORDER BY 4;
END;
$$;


-- =====================================================================
-- 08_admin.sql
-- =====================================================================

-- 08_admin.sql
-- Políticas extra para que un administrador pueda gestionar usuarios desde la app

-- Permitir a un admin ver y actualizar el rol de cualquier perfil
CREATE POLICY "perfiles_admin_select_all" ON public.perfiles
  FOR SELECT TO authenticated
  USING ((select get_my_rol()) = 'administrador');

CREATE POLICY "perfiles_admin_update_all" ON public.perfiles
  FOR UPDATE TO authenticated
  USING ((select get_my_rol()) = 'administrador')
  WITH CHECK ((select get_my_rol()) = 'administrador');

-- NOTA: La creación de nuevos usuarios desde el frontend requiere
-- una Supabase Edge Function con service_role (ver supabase/functions/).
-- Alternativa más simple: usar invitaciones de Supabase Auth (invite by email).


-- =====================================================================
-- 09_totales.sql
-- =====================================================================

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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.reunif, 0) + COALESCE(NEW.fdo_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.positiva_vida, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_rehabilita, 0) + COALESCE(NEW.dscto_autoriz_ii, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.pichincha, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.fesalud, 0) + COALESCE(NEW.dscto_somun, 0) + COALESCE(NEW.coop_virgen_n, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.rta_5ta_cat, 0) + COALESCE(NEW.c_sindical, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.positiva_vida, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.pichincha, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_rehabilita, 0) + COALESCE(NEW.renta_5ta_cat, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.somun, 0) + COALESCE(NEW.coop_virgen_n, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.fesalud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.c_sind, 0) + COALESCE(NEW.dscto_autoriz, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_rehabilita, 0) + COALESCE(NEW.renta_5ta_cat, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.pichincha, 0) + COALESCE(NEW.somun, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.fesalud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.c_sind, 0) + COALESCE(NEW.dscto_ii, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.comis_variable, 0) + COALESCE(NEW.retenc_judicial, 0) + COALESCE(NEW.rimac, 0) + COALESCE(NEW.cuota_sindical, 0) + COALESCE(NEW.coop_la_rehabilitadora, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_san_cristobal, 0) + COALESCE(NEW.coop_virgen_las_nieves, 0) + COALESCE(NEW.otros_r_dtos, 0) + COALESCE(NEW.dscto_ii, 0))::numeric, 2);
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
  NEW.t_ingreso := ROUND((COALESCE(NEW.r_basica, 0) + COALESCE(NEW.r_reunif, 0) + COALESCE(NEW.b_familiar, 0) + COALESCE(NEW.b_pers, 0) + COALESCE(NEW.inc_neg_col_ds320_22, 0) + COALESCE(NEW.memo_159_2025_ogrrhh_mpi, 0) + COALESCE(NEW.c_vida_tph, 0) + COALESCE(NEW.reaj_c_vida_10, 0) + COALESCE(NEW.reaj_c_vida_7, 0) + COALESCE(NEW.inc_neg_col_ds314_23, 0) + COALESCE(NEW.inc_neg_col_ds268_24, 0) + COALESCE(NEW.inc_neg_col_ds280_24, 0) + COALESCE(NEW.m_jud_inc_ref_mov, 0) + COALESCE(NEW.inc_neg_col_ds326_25, 0) + COALESCE(NEW.inc_3_3, 0) + COALESCE(NEW.inc_10_23, 0) + COALESCE(NEW.inc_3, 0) + COALESCE(NEW.bonif_dif, 0) + COALESCE(NEW.reinteg, 0) + COALESCE(NEW.ref_mov, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.fdo_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.coop_la_rehabilitad, 0) + COALESCE(NEW.bco_pichincha, 0) + COALESCE(NEW.coop_s_cristobal, 0) + COALESCE(NEW.ccp, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.dsct_autorizado, 0) + COALESCE(NEW.coop_maria_magdalena, 0) + COALESCE(NEW.la_positiva_vida, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.cuota_sindical, 0) + COALESCE(NEW.coop_virgen_nieves, 0) + COALESCE(NEW.descuento_sitramun, 0) + COALESCE(NEW.regularizacion, 0) + COALESCE(NEW.clap, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_m_magd, 0) + COALESCE(NEW.desc_var, 0) + COALESCE(NEW.seguro_fe_salud, 0) + COALESCE(NEW.banco_pichincha, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.coop_la_rehabilitadora, 0) + COALESCE(NEW.coop_virgen_las_nieves, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_m_magd, 0) + COALESCE(NEW.desc_var, 0) + COALESCE(NEW.seguro_fe_salud, 0) + COALESCE(NEW.banco_pichincha, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.coop_la_rehabilitadora, 0) + COALESCE(NEW.coop_virgen_las_nieves, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_m_magd, 0) + COALESCE(NEW.desc_var, 0) + COALESCE(NEW.seguro_fe_salud, 0) + COALESCE(NEW.banco_pichincha, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.coop_la_rehabilitadora, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.coop_la_rehab, 0) + COALESCE(NEW.dscto_fesalud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.ret_4ta_categ, 0) + COALESCE(NEW.cop_nieves, 0) + COALESCE(NEW.san_miguel, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.c_sind, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.fdo_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.d_aut_sit_mpi, 0) + COALESCE(NEW.dscto_otros, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ccp, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.dscto_aut_varios, 0) + COALESCE(NEW.coop_m_magd, 0) + COALESCE(NEW.la_positiva_vida, 0) + COALESCE(NEW.cep, 0) + COALESCE(NEW.c_sind_sit_mpi, 0) + COALESCE(NEW.clap, 0))::numeric, 2);
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
  NEW.t_dsctos  := ROUND((COALESCE(NEW.descuento_snp, 0) + COALESCE(NEW.fdo_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.seg_rimac, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.d_aut_sit_mpi, 0) + COALESCE(NEW.dscto_otros, 0) + COALESCE(NEW.coop_s_crist, 0) + COALESCE(NEW.ccp, 0) + COALESCE(NEW.faltas_tarda, 0) + COALESCE(NEW.ret_jud, 0) + COALESCE(NEW.dscto_aut_varios, 0) + COALESCE(NEW.la_positiva_vida, 0) + COALESCE(NEW.cep, 0) + COALESCE(NEW.c_sind_sit_mpi, 0) + COALESCE(NEW.clap, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_alcalde_trg ON public.alcalde;
CREATE TRIGGER calc_totales_alcalde_trg
  BEFORE INSERT OR UPDATE ON public.alcalde
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_alcalde();


-- =====================================================================
-- 10_indices.sql
-- =====================================================================

-- ================================================================
-- 10_indices.sql  —  Generado automáticamente por scripts/genSql.mjs
-- NO editar a mano: editar src/config/planillas.js y regenerar
--
-- Índices trigram para que las búsquedas ILIKE '%texto%' por apellidos_y_nombres
-- (RPC buscar_trabajador) no hagan full scan en las 19 tablas.
-- Requiere la extensión pg_trgm (ver 01_extensions.sql).
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_obreros_permanentes_nombre_trgm
  ON public.obreros_permanentes USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_obreros_plazo_indeterminado_nombre_trgm
  ON public.obreros_plazo_indeterminado USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_obreros_mandato_judicial_nombre_trgm
  ON public.obreros_mandato_judicial USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_obreros_concurso_nombre_trgm
  ON public.obreros_concurso USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_obreros_necesidad_mercado_nombre_trgm
  ON public.obreros_necesidad_mercado USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_empleados_permanentes_nombre_trgm
  ON public.empleados_permanentes USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_empleados_contrato_plazo_indet_nombre_trgm
  ON public.empleados_contrato_plazo_indet USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_empleados_contrato_provisional_nombre_trgm
  ON public.empleados_contrato_provisional USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_empleados_mandato_judicial_24041_nombre_trgm
  ON public.empleados_mandato_judicial_24041 USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cas_general_nombre_trgm
  ON public.cas_general USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cas_choferes_nombre_trgm
  ON public.cas_choferes USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cas_i_2025_nombre_trgm
  ON public.cas_i_2025 USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cas_ii_2023_nombre_trgm
  ON public.cas_ii_2023 USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cas_ii_2024_nombre_trgm
  ON public.cas_ii_2024 USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cas_iii_2025_nombre_trgm
  ON public.cas_iii_2025 USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cas_funcional_nombre_trgm
  ON public.cas_funcional USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cesantes_pensionistas_nombre_trgm
  ON public.cesantes_pensionistas USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_gerente_municipal_nombre_trgm
  ON public.gerente_municipal USING gin (apellidos_y_nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_alcalde_nombre_trgm
  ON public.alcalde USING gin (apellidos_y_nombres gin_trgm_ops);


-- =====================================================================
-- 11_operaciones.sql
-- =====================================================================

-- 11_operaciones.sql
-- RPCs para operaciones masivas ATÓMICAS (una sola transacción por llamada).
-- Reemplazan a los upserts/updates por bloques que hacía el cliente, evitando
-- estados parciales si algo falla a mitad de camino.
--
-- Estas funciones:
--   · validan que el usuario sea administrador (defensa en profundidad, además de RLS),
--   · validan el nombre de la tabla contra una whitelist (evita SQL injection vía p_tabla).
-- Dependen de: get_my_rol() (04_rls.sql) y los triggers de totales (09_totales.sql).

-- Whitelist de tablas de planillas
CREATE OR REPLACE FUNCTION public._es_tabla_planilla(p_tabla TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT p_tabla IN (
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','cas_choferes','cas_i_2025',
    'cas_ii_2023','cas_ii_2024','cas_iii_2025','cas_funcional',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  );
$$;

-- ─── recalcular_totales ─────────────────────────────────────────────────────
-- Fuerza el recálculo de los totales de toda la planilla en una transacción:
-- un UPDATE que dispara el trigger BEFORE UPDATE (09_totales.sql) en cada fila.
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

-- ─── actualizar_columna_planilla ────────────────────────────────────────────
-- Actualiza UNA sola columna de una planilla, emparejando por DNI, a partir de
-- una lista JSONB [{dni, valor}, ...] en una sola transacción atómica.
-- Los DNI que no existan en la tabla simplemente no se tocan (sin error).
-- El BEFORE UPDATE de totales se dispara, así que t_ingreso/t_dsctos/t_liquido
-- quedan recalculados si la columna afectada participa en el cálculo.
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

  -- La columna debe existir y no ser una columna gestionada/clave.
  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_tabla AND column_name = p_columna;
  IF col_type IS NULL THEN
    RAISE EXCEPTION 'Columna no existe: %', p_columna;
  END IF;
  IF p_columna IN ('id', 'dni', 'created_at', 'updated_at') THEN
    RAISE EXCEPTION 'Columna protegida: %', p_columna;
  END IF;

  -- UPDATE atómico desde la lista {dni, valor}; el valor se castea al tipo real
  -- de la columna destino. Las filas cuyo DNI no exista no se actualizan.
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


-- =====================================================================
-- 12_fix_auditoria_y_admin.sql
-- =====================================================================

-- 12_fix_auditoria_y_admin.sql
-- Correctivo para dos problemas en una base de datos YA creada:
--   (1) El historial de auditoría no se ve porque la página embebe
--       perfiles(nombre) pero auditoria.usuario_id apuntaba a auth.users,
--       no a public.perfiles → PostgREST falla con PGRST200.
--   (2) El administrador no ve a los demás usuarios si 08_admin.sql
--       no se llegó a ejecutar.
-- Ejecutar este archivo completo en el SQL Editor de Supabase.

-- ─── (1) Reapuntar la FK de auditoria.usuario_id hacia public.perfiles ───────
ALTER TABLE public.auditoria
  DROP CONSTRAINT IF EXISTS auditoria_usuario_id_fkey;

ALTER TABLE public.auditoria
  ADD CONSTRAINT auditoria_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id) ON DELETE SET NULL;

-- ─── (2) Asegurar que existan las políticas de administrador (idempotente) ───
DROP POLICY IF EXISTS "perfiles_admin_select_all" ON public.perfiles;
CREATE POLICY "perfiles_admin_select_all" ON public.perfiles
  FOR SELECT TO authenticated
  USING ((select get_my_rol()) = 'administrador');

DROP POLICY IF EXISTS "perfiles_admin_update_all" ON public.perfiles;
CREATE POLICY "perfiles_admin_update_all" ON public.perfiles
  FOR UPDATE TO authenticated
  USING ((select get_my_rol()) = 'administrador')
  WITH CHECK ((select get_my_rol()) = 'administrador');

-- ─── Refrescar el caché de esquema de PostgREST (relación nueva) ─────────────
NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- 13_dni_unico_global.sql
-- =====================================================================

-- 13_dni_unico_global.sql
-- Hace que el DNI sea ÚNICO entre TODAS las planillas (no solo dentro de cada
-- tabla). PostgreSQL no permite un UNIQUE que abarque varias tablas, así que se
-- usa una tabla-registro central (public.dni_registro) con PRIMARY KEY en dni,
-- mantenida por un trigger en las 19 planillas. El PK del registro es la
-- garantía atómica (a prueba de concurrencia); el chequeo SELECT solo sirve
-- para dar un mensaje de error claro.
--
-- ⚠️ ANTES DE EJECUTAR: si ya tienes DNIs repetidos entre planillas, el backfill
--    fallará. Detecta y resuelve los duplicados con esta consulta:
--
--    SELECT dni, count(*) AS veces, string_agg(tabla, ', ') AS planillas
--    FROM public.vw_dni_todos
--    GROUP BY dni HAVING count(*) > 1
--    ORDER BY veces DESC;
--
--    (la vista vw_dni_todos se crea más abajo; puedes crearla primero y luego
--     borrar/corregir las filas duplicadas antes de seguir con el backfill).

-- ─── Vista auxiliar: todos los DNIs de las 19 planillas ─────────────────────
-- security_invoker = on  → la vista respeta el RLS del usuario que la consulta
-- (no la del creador). Sin esto, Supabase la marca como SECURITY DEFINER crítico.
CREATE OR REPLACE VIEW public.vw_dni_todos
WITH (security_invoker = on) AS
  SELECT dni, id AS registro_id, 'obreros_permanentes'::text          AS tabla FROM public.obreros_permanentes
  UNION ALL SELECT dni, id, 'obreros_plazo_indeterminado'      FROM public.obreros_plazo_indeterminado
  UNION ALL SELECT dni, id, 'obreros_mandato_judicial'         FROM public.obreros_mandato_judicial
  UNION ALL SELECT dni, id, 'obreros_concurso'                 FROM public.obreros_concurso
  UNION ALL SELECT dni, id, 'obreros_necesidad_mercado'        FROM public.obreros_necesidad_mercado
  UNION ALL SELECT dni, id, 'empleados_permanentes'            FROM public.empleados_permanentes
  UNION ALL SELECT dni, id, 'empleados_contrato_plazo_indet'   FROM public.empleados_contrato_plazo_indet
  UNION ALL SELECT dni, id, 'empleados_contrato_provisional'   FROM public.empleados_contrato_provisional
  UNION ALL SELECT dni, id, 'empleados_mandato_judicial_24041' FROM public.empleados_mandato_judicial_24041
  UNION ALL SELECT dni, id, 'cas_general'                      FROM public.cas_general
  UNION ALL SELECT dni, id, 'cas_choferes'                     FROM public.cas_choferes
  UNION ALL SELECT dni, id, 'cas_i_2025'                       FROM public.cas_i_2025
  UNION ALL SELECT dni, id, 'cas_ii_2023'                      FROM public.cas_ii_2023
  UNION ALL SELECT dni, id, 'cas_ii_2024'                      FROM public.cas_ii_2024
  UNION ALL SELECT dni, id, 'cas_iii_2025'                     FROM public.cas_iii_2025
  UNION ALL SELECT dni, id, 'cas_funcional'                    FROM public.cas_funcional
  UNION ALL SELECT dni, id, 'cesantes_pensionistas'            FROM public.cesantes_pensionistas
  UNION ALL SELECT dni, id, 'gerente_municipal'                FROM public.gerente_municipal
  UNION ALL SELECT dni, id, 'alcalde'                          FROM public.alcalde;

-- ─── Tabla-registro central de DNIs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dni_registro (
  dni         INTEGER PRIMARY KEY,                 -- UNIQUE global
  tabla       TEXT NOT NULL,
  registro_id UUID NOT NULL UNIQUE
);

-- Bloqueada para acceso directo; el trigger (SECURITY DEFINER) la mantiene.
ALTER TABLE public.dni_registro ENABLE ROW LEVEL SECURITY;

-- ─── Backfill desde los datos existentes (falla si hay duplicados cruzados) ──
INSERT INTO public.dni_registro (dni, tabla, registro_id)
SELECT dni, tabla, registro_id FROM public.vw_dni_todos;

-- ─── Trigger que mantiene el registro y rechaza DNIs repetidos ──────────────
CREATE OR REPLACE FUNCTION public.sync_dni_registro()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tabla TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.dni_registro WHERE registro_id = OLD.id;
    RETURN OLD;
  END IF;

  -- En UPDATE, si el DNI no cambió no hay nada que validar
  IF TG_OP = 'UPDATE' AND NEW.dni IS NOT DISTINCT FROM OLD.dni THEN
    RETURN NEW;
  END IF;

  -- Mensaje claro si el DNI ya pertenece a otra fila/planilla
  SELECT tabla INTO v_tabla
    FROM public.dni_registro
   WHERE dni = NEW.dni AND registro_id <> NEW.id
   LIMIT 1;
  IF v_tabla IS NOT NULL THEN
    RAISE EXCEPTION
      'El DNI % ya está registrado en la planilla "%". Un mismo DNI no puede existir en dos planillas.',
      NEW.dni, v_tabla
      USING ERRCODE = 'unique_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dni_registro (dni, tabla, registro_id)
    VALUES (NEW.dni, TG_TABLE_NAME, NEW.id);
  ELSE  -- UPDATE con DNI cambiado
    UPDATE public.dni_registro
       SET dni = NEW.dni, tabla = TG_TABLE_NAME
     WHERE registro_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── Aplicar el trigger a las 19 planillas ──────────────────────────────────
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','cas_choferes','cas_i_2025',
    'cas_ii_2023','cas_ii_2024','cas_iii_2025','cas_funcional',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS dni_unico_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER dni_unico_%s
       AFTER INSERT OR UPDATE OF dni OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.sync_dni_registro()',
      t, t
    );
  END LOOP;
END;
$$;


-- =====================================================================
-- HISTORIZACIÓN MENSUAL (columna `periodo`)
-- ---------------------------------------------------------------------
-- Convierte cada planilla en un histórico mensual: una fila por
-- (trabajador, mes). La identidad (dni, nombres, fecha de ingreso, snp,
-- tipo de acto) se mantiene igual cada mes; el resto varía. Los meses
-- cerrados quedan en solo lectura. Este bloque es idempotente y, en una
-- instalación desde cero, ajusta las tablas/funciones creadas arriba.
-- (Mismo contenido que supabase/migracion_historico_periodo.sql.)
-- =====================================================================

-- 1) Columna periodo + unicidad (dni, periodo) + índice
DO $mig$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','cas_choferes','cas_i_2025',
    'cas_ii_2023','cas_ii_2024','cas_iii_2025','cas_funcional',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS periodo DATE', t);
    EXECUTE format('UPDATE public.%I SET periodo = DATE ''2026-06-01'' WHERE periodo IS NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN periodo SET DEFAULT date_trunc(''month'', now())::date', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN periodo SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_dni_key');
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_dni_periodo_key') THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (dni, periodo)', t, t || '_dni_periodo_key');
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (periodo)', 'idx_' || t || '_periodo', t);
  END LOOP;
END
$mig$;

-- 2) Bloqueo de meses cerrados (solo el mes abierto = MAX(periodo) es editable)
CREATE OR REPLACE FUNCTION public.proteger_periodo_cerrado()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
DECLARE
  v_max     DATE;
  v_periodo DATE;
BEGIN
  IF current_setting('app.bypass_periodo', true) = '1' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  v_periodo := CASE WHEN TG_OP = 'DELETE' THEN OLD.periodo ELSE NEW.periodo END;
  EXECUTE format('SELECT MAX(periodo) FROM public.%I', TG_TABLE_NAME) INTO v_max;
  IF v_max IS NOT NULL AND v_periodo < v_max THEN
    RAISE EXCEPTION
      'El mes % está cerrado (solo lectura). Solo se puede modificar el mes abierto (%).',
      to_char(v_periodo, 'YYYY-MM'), to_char(v_max, 'YYYY-MM')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END
$fn$;

DO $att$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','cas_choferes','cas_i_2025',
    'cas_ii_2023','cas_ii_2024','cas_iii_2025','cas_funcional',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS proteger_periodo_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER proteger_periodo_%s
       BEFORE INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.proteger_periodo_cerrado()',
      t, t
    );
  END LOOP;
END
$att$;

-- 3) DNI único POR PERIODO
DROP VIEW IF EXISTS public.vw_dni_todos;
CREATE VIEW public.vw_dni_todos WITH (security_invoker = on) AS
  SELECT dni, periodo, id AS registro_id, 'obreros_permanentes'::text          AS tabla FROM public.obreros_permanentes
  UNION ALL SELECT dni, periodo, id, 'obreros_plazo_indeterminado'      FROM public.obreros_plazo_indeterminado
  UNION ALL SELECT dni, periodo, id, 'obreros_mandato_judicial'         FROM public.obreros_mandato_judicial
  UNION ALL SELECT dni, periodo, id, 'obreros_concurso'                 FROM public.obreros_concurso
  UNION ALL SELECT dni, periodo, id, 'obreros_necesidad_mercado'        FROM public.obreros_necesidad_mercado
  UNION ALL SELECT dni, periodo, id, 'empleados_permanentes'            FROM public.empleados_permanentes
  UNION ALL SELECT dni, periodo, id, 'empleados_contrato_plazo_indet'   FROM public.empleados_contrato_plazo_indet
  UNION ALL SELECT dni, periodo, id, 'empleados_contrato_provisional'   FROM public.empleados_contrato_provisional
  UNION ALL SELECT dni, periodo, id, 'empleados_mandato_judicial_24041' FROM public.empleados_mandato_judicial_24041
  UNION ALL SELECT dni, periodo, id, 'cas_general'                      FROM public.cas_general
  UNION ALL SELECT dni, periodo, id, 'cas_choferes'                     FROM public.cas_choferes
  UNION ALL SELECT dni, periodo, id, 'cas_i_2025'                       FROM public.cas_i_2025
  UNION ALL SELECT dni, periodo, id, 'cas_ii_2023'                      FROM public.cas_ii_2023
  UNION ALL SELECT dni, periodo, id, 'cas_ii_2024'                      FROM public.cas_ii_2024
  UNION ALL SELECT dni, periodo, id, 'cas_iii_2025'                     FROM public.cas_iii_2025
  UNION ALL SELECT dni, periodo, id, 'cas_funcional'                    FROM public.cas_funcional
  UNION ALL SELECT dni, periodo, id, 'cesantes_pensionistas'            FROM public.cesantes_pensionistas
  UNION ALL SELECT dni, periodo, id, 'gerente_municipal'                FROM public.gerente_municipal
  UNION ALL SELECT dni, periodo, id, 'alcalde'                          FROM public.alcalde;

ALTER TABLE public.dni_registro ADD COLUMN IF NOT EXISTS periodo DATE;
UPDATE public.dni_registro d SET periodo = v.periodo FROM public.vw_dni_todos v WHERE v.registro_id = d.registro_id AND d.periodo IS NULL;
UPDATE public.dni_registro SET periodo = DATE '2026-06-01' WHERE periodo IS NULL;
ALTER TABLE public.dni_registro ALTER COLUMN periodo SET NOT NULL;
ALTER TABLE public.dni_registro DROP CONSTRAINT IF EXISTS dni_registro_pkey;
ALTER TABLE public.dni_registro ADD PRIMARY KEY (dni, periodo);

CREATE OR REPLACE FUNCTION public.sync_dni_registro()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $sync$
DECLARE
  v_tabla TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.dni_registro WHERE registro_id = OLD.id;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.dni IS NOT DISTINCT FROM OLD.dni THEN
    RETURN NEW;
  END IF;
  SELECT tabla INTO v_tabla
    FROM public.dni_registro
   WHERE dni = NEW.dni AND periodo = NEW.periodo AND registro_id <> NEW.id
   LIMIT 1;
  IF v_tabla IS NOT NULL THEN
    RAISE EXCEPTION
      'El DNI % ya está registrado en la planilla "%" para ese mes. Un mismo DNI no puede existir en dos planillas el mismo periodo.',
      NEW.dni, v_tabla
      USING ERRCODE = 'unique_violation';
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dni_registro (dni, periodo, tabla, registro_id)
    VALUES (NEW.dni, NEW.periodo, TG_TABLE_NAME, NEW.id);
  ELSE
    UPDATE public.dni_registro SET dni = NEW.dni, tabla = TG_TABLE_NAME WHERE registro_id = NEW.id;
  END IF;
  RETURN NEW;
END
$sync$;

-- 4) RPCs existentes ahora reciben el periodo
DROP FUNCTION IF EXISTS public.resumen_planillas();
CREATE OR REPLACE FUNCTION public.resumen_planillas(p_periodo DATE)
RETURNS TABLE (tabla TEXT, n_registros BIGINT, suma_ingreso NUMERIC, suma_dsctos NUMERIC, suma_liquido NUMERIC)
LANGUAGE sql SECURITY DEFINER STABLE AS $rsm$
  SELECT 'obreros_permanentes',            COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_permanentes           WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_plazo_indeterminado',    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_plazo_indeterminado   WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_mandato_judicial',       COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_mandato_judicial      WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_concurso',               COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_concurso              WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_necesidad_mercado',      COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_necesidad_mercado     WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_permanentes',          COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_permanentes         WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_contrato_plazo_indet', COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_plazo_indet WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_contrato_provisional', COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_provisional WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_mandato_judicial_24041',COUNT(*),COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_mandato_judicial_24041 WHERE periodo = p_periodo
  UNION ALL SELECT 'cas_general',                    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_general                   WHERE periodo = p_periodo
  UNION ALL SELECT 'cas_choferes',                   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_choferes                  WHERE periodo = p_periodo
  UNION ALL SELECT 'cas_i_2025',                     COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_i_2025                    WHERE periodo = p_periodo
  UNION ALL SELECT 'cas_ii_2023',                    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_ii_2023                   WHERE periodo = p_periodo
  UNION ALL SELECT 'cas_ii_2024',                    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_ii_2024                   WHERE periodo = p_periodo
  UNION ALL SELECT 'cas_iii_2025',                   COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_iii_2025                  WHERE periodo = p_periodo
  UNION ALL SELECT 'cas_funcional',                  COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_funcional                 WHERE periodo = p_periodo
  UNION ALL SELECT 'cesantes_pensionistas',          COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cesantes_pensionistas         WHERE periodo = p_periodo
  UNION ALL SELECT 'gerente_municipal',              COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.gerente_municipal             WHERE periodo = p_periodo
  UNION ALL SELECT 'alcalde',                        COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.alcalde                       WHERE periodo = p_periodo;
$rsm$;

DROP FUNCTION IF EXISTS public.buscar_trabajador(TEXT);
CREATE OR REPLACE FUNCTION public.buscar_trabajador(termino TEXT, p_periodo DATE)
RETURNS TABLE (tabla TEXT, slug TEXT, dni INTEGER, apellidos_y_nombres TEXT, t_liquido NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $bus$
DECLARE
  patron  TEXT    := '%' || replace(replace(replace(termino, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  es_dni  BOOLEAN := termino ~ '^\d{1,9}$';
  dni_num INTEGER := CASE WHEN termino ~ '^\d{1,9}$' THEN termino::INTEGER ELSE NULL END;
BEGIN
  RETURN QUERY
  SELECT 'obreros_permanentes'::text, 'obreros-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_permanentes t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_plazo_indeterminado'::text, 'obreros-plazo-indeterminado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_plazo_indeterminado t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_mandato_judicial'::text, 'obreros-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_mandato_judicial t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_concurso'::text, 'obreros-concurso'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_concurso t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_necesidad_mercado'::text, 'obreros-necesidad-mercado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_necesidad_mercado t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_permanentes'::text, 'empleados-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_permanentes t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_contrato_plazo_indet'::text, 'empleados-contrato-plazo-indet'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_plazo_indet t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_contrato_provisional'::text, 'empleados-contrato-provisional'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_provisional t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_mandato_judicial_24041'::text, 'empleados-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_mandato_judicial_24041 t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cas_general'::text, 'cas-general'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_general t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cas_choferes'::text, 'cas-choferes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_choferes t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cas_i_2025'::text, 'cas-i-2025'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_i_2025 t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cas_ii_2023'::text, 'cas-ii-2023'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_ii_2023 t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cas_ii_2024'::text, 'cas-ii-2024'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_ii_2024 t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cas_iii_2025'::text, 'cas-iii-2025'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_iii_2025 t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cas_funcional'::text, 'cas-funcional'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_funcional t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cesantes_pensionistas'::text, 'cesantes-pensionistas'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cesantes_pensionistas t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'gerente_municipal'::text, 'gerente-municipal'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.gerente_municipal t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'alcalde'::text, 'alcalde'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.alcalde t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  ORDER BY 4;
END
$bus$;

DROP FUNCTION IF EXISTS public.recalcular_totales(TEXT);
CREATE OR REPLACE FUNCTION public.recalcular_totales(p_tabla TEXT, p_periodo DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $rec$
DECLARE n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN RAISE EXCEPTION 'Tabla no permitida: %', p_tabla; END IF;
  EXECUTE format('UPDATE public.%I SET updated_at = now() WHERE periodo = $1', p_tabla) USING p_periodo;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$rec$;

DROP FUNCTION IF EXISTS public.actualizar_columna_planilla(TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.actualizar_columna_planilla(p_tabla TEXT, p_periodo DATE, p_columna TEXT, p_valores JSONB)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $act$
DECLARE col_type TEXT; n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN RAISE EXCEPTION 'No autorizado'; END IF;
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
$act$;

-- 5) RPCs nuevas: abrir_periodo, periodos_planilla, corregir_identidad
CREATE OR REPLACE FUNCTION public.abrir_periodo(p_tabla TEXT, p_periodo DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $abr$
DECLARE v_src DATE; v_cols TEXT; n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF NOT public._es_tabla_planilla(p_tabla) THEN RAISE EXCEPTION 'Tabla no permitida: %', p_tabla; END IF;
  p_periodo := date_trunc('month', p_periodo)::date;
  EXECUTE format('SELECT MAX(periodo) FROM public.%I', p_tabla) INTO v_src;
  IF v_src IS NULL THEN RAISE EXCEPTION 'La planilla no tiene datos del mes anterior para generar el nuevo mes.'; END IF;
  IF p_periodo <= v_src THEN RAISE EXCEPTION 'El mes a generar (%) debe ser posterior al mes actual (%).', to_char(p_periodo, 'YYYY-MM'), to_char(v_src, 'YYYY-MM'); END IF;
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_tabla
     AND column_name IN ('dni','apellidos_y_nombres','f_ingreso','fecha_ing','snp','tipo_acto_administrativo');
  EXECUTE format('INSERT INTO public.%I (periodo, %s) SELECT $1, %s FROM public.%I WHERE periodo = $2', p_tabla, v_cols, v_cols, p_tabla) USING p_periodo, v_src;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$abr$;

CREATE OR REPLACE FUNCTION public.periodos_planilla(p_tabla TEXT)
RETURNS TABLE (periodo DATE) LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $per$
BEGIN
  IF NOT public._es_tabla_planilla(p_tabla) THEN RAISE EXCEPTION 'Tabla no permitida: %', p_tabla; END IF;
  RETURN QUERY EXECUTE format('SELECT DISTINCT periodo FROM public.%I ORDER BY periodo DESC', p_tabla);
END
$per$;

CREATE OR REPLACE FUNCTION public.corregir_identidad(p_tabla TEXT, p_dni INTEGER, p_datos JSONB)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $cor$
DECLARE
  v_allowed TEXT[] := ARRAY['apellidos_y_nombres','f_ingreso','fecha_ing','snp','tipo_acto_administrativo'];
  v_cols TEXT[]; v_key TEXT; v_set TEXT := ''; n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN RAISE EXCEPTION 'No autorizado'; END IF;
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
$cor$;


-- =====================================================================
-- Endurecimiento de seguridad (auditoría 2026-07)
--   C-1: las RPCs SECURITY DEFINER NO deben ser ejecutables por 'anon'
--        (buscar_trabajador/resumen_planillas devolvían PII+sueldos sin login).
--   M-2: fijar search_path en todas nuestras funciones (anti search_path hijack).
--   M-4: política SELECT explícita para dni_registro (RLS activo sin política).
-- Idempotente: se puede re-ejecutar sin efectos adversos.
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.buscar_trabajador(text, date)                       FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.resumen_planillas(date)                              FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.periodos_planilla(text)                              FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.recalcular_totales(text, date)                       FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.actualizar_columna_planilla(text, date, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.abrir_periodo(text, date)                            FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.corregir_identidad(text, integer, jsonb)             FROM anon, public;

GRANT EXECUTE ON FUNCTION public.buscar_trabajador(text, date)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.resumen_planillas(date)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.periodos_planilla(text)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_totales(text, date)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_columna_planilla(text, date, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.abrir_periodo(text, date)                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.corregir_identidad(text, integer, jsonb)             TO authenticated;

DO $hard$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) c WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END
$hard$;

DROP POLICY IF EXISTS dni_registro_select ON public.dni_registro;
CREATE POLICY dni_registro_select ON public.dni_registro
  FOR SELECT TO authenticated
  USING ((select public.get_my_rol()) IN ('consultor', 'editor', 'administrador'));


-- =====================================================================
-- Recarga del esquema de PostgREST
-- Tras ejecutar todo el archivo, PostgREST recarga su caché para exponer
-- de inmediato las funciones/columnas nuevas en la API REST.
-- =====================================================================
NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- LIMPIEZA: eliminar 6 subplanillas CAS (conservar solo cas_general)
-- Integrado desde supabase/migracion_eliminar_cas_subplanillas.sql
-- Se ejecuta al final: las tablas se crean arriba y aquí se eliminan las 6,
-- dejando el esquema final con 13 planillas. Recrea whitelist/RPCs/vista.
-- =====================================================================
-- El mismo bloque está integrado al final de _migracion_completa.sql.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- ================================================================

-- 1) Whitelist de tablas (sin las 6)
CREATE OR REPLACE FUNCTION public._es_tabla_planilla(p_tabla text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $function$
  SELECT p_tabla IN (
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  );
$function$;

-- 2) resumen_planillas (sin las 6)
CREATE OR REPLACE FUNCTION public.resumen_planillas(p_periodo date)
RETURNS TABLE(tabla text, n_registros bigint, suma_ingreso numeric, suma_dsctos numeric, suma_liquido numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT 'obreros_permanentes',            COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_permanentes           WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_plazo_indeterminado',    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_plazo_indeterminado   WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_mandato_judicial',       COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_mandato_judicial      WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_concurso',               COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_concurso              WHERE periodo = p_periodo
  UNION ALL SELECT 'obreros_necesidad_mercado',      COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.obreros_necesidad_mercado     WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_permanentes',          COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_permanentes         WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_contrato_plazo_indet', COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_plazo_indet WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_contrato_provisional', COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_contrato_provisional WHERE periodo = p_periodo
  UNION ALL SELECT 'empleados_mandato_judicial_24041',COUNT(*),COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.empleados_mandato_judicial_24041 WHERE periodo = p_periodo
  UNION ALL SELECT 'cas_general',                    COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cas_general                   WHERE periodo = p_periodo
  UNION ALL SELECT 'cesantes_pensionistas',          COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.cesantes_pensionistas         WHERE periodo = p_periodo
  UNION ALL SELECT 'gerente_municipal',              COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.gerente_municipal             WHERE periodo = p_periodo
  UNION ALL SELECT 'alcalde',                        COUNT(*), COALESCE(SUM(t_ingreso),0), COALESCE(SUM(t_dsctos),0), COALESCE(SUM(t_liquido),0) FROM public.alcalde                       WHERE periodo = p_periodo;
$function$;

-- 3) buscar_trabajador (sin las 6)
CREATE OR REPLACE FUNCTION public.buscar_trabajador(termino text, p_periodo date)
RETURNS TABLE(tabla text, slug text, dni integer, apellidos_y_nombres text, t_liquido numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  patron  TEXT    := '%' || replace(replace(replace(termino, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  es_dni  BOOLEAN := termino ~ '^\d{1,9}$';
  dni_num INTEGER := CASE WHEN termino ~ '^\d{1,9}$' THEN termino::INTEGER ELSE NULL END;
BEGIN
  RETURN QUERY
  SELECT 'obreros_permanentes'::text, 'obreros-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_permanentes t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_plazo_indeterminado'::text, 'obreros-plazo-indeterminado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_plazo_indeterminado t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_mandato_judicial'::text, 'obreros-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_mandato_judicial t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_concurso'::text, 'obreros-concurso'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_concurso t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'obreros_necesidad_mercado'::text, 'obreros-necesidad-mercado'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.obreros_necesidad_mercado t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_permanentes'::text, 'empleados-permanentes'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_permanentes t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_contrato_plazo_indet'::text, 'empleados-contrato-plazo-indet'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_plazo_indet t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_contrato_provisional'::text, 'empleados-contrato-provisional'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_contrato_provisional t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'empleados_mandato_judicial_24041'::text, 'empleados-mandato-judicial'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.empleados_mandato_judicial_24041 t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cas_general'::text, 'cas-general'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cas_general t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'cesantes_pensionistas'::text, 'cesantes-pensionistas'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.cesantes_pensionistas t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'gerente_municipal'::text, 'gerente-municipal'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.gerente_municipal t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  UNION ALL SELECT 'alcalde'::text, 'alcalde'::text, t.dni, t.apellidos_y_nombres, t.t_liquido FROM public.alcalde t WHERE t.periodo = p_periodo AND ((es_dni AND t.dni = dni_num) OR t.apellidos_y_nombres ILIKE patron)
  ORDER BY 4;
END
$function$;

-- 4) vw_dni_todos (sin las 6), preservando security_invoker
CREATE OR REPLACE VIEW public.vw_dni_todos WITH (security_invoker=on) AS
  SELECT dni, periodo, id AS registro_id, 'obreros_permanentes'::text AS tabla FROM public.obreros_permanentes
  UNION ALL SELECT dni, periodo, id, 'obreros_plazo_indeterminado'::text FROM public.obreros_plazo_indeterminado
  UNION ALL SELECT dni, periodo, id, 'obreros_mandato_judicial'::text FROM public.obreros_mandato_judicial
  UNION ALL SELECT dni, periodo, id, 'obreros_concurso'::text FROM public.obreros_concurso
  UNION ALL SELECT dni, periodo, id, 'obreros_necesidad_mercado'::text FROM public.obreros_necesidad_mercado
  UNION ALL SELECT dni, periodo, id, 'empleados_permanentes'::text FROM public.empleados_permanentes
  UNION ALL SELECT dni, periodo, id, 'empleados_contrato_plazo_indet'::text FROM public.empleados_contrato_plazo_indet
  UNION ALL SELECT dni, periodo, id, 'empleados_contrato_provisional'::text FROM public.empleados_contrato_provisional
  UNION ALL SELECT dni, periodo, id, 'empleados_mandato_judicial_24041'::text FROM public.empleados_mandato_judicial_24041
  UNION ALL SELECT dni, periodo, id, 'cas_general'::text FROM public.cas_general
  UNION ALL SELECT dni, periodo, id, 'cesantes_pensionistas'::text FROM public.cesantes_pensionistas
  UNION ALL SELECT dni, periodo, id, 'gerente_municipal'::text FROM public.gerente_municipal
  UNION ALL SELECT dni, periodo, id, 'alcalde'::text FROM public.alcalde;

-- 5) Eliminar las 6 tablas (arrastra triggers, políticas, índices y publicación realtime)
DROP TABLE IF EXISTS public.cas_choferes  CASCADE;
DROP TABLE IF EXISTS public.cas_i_2025    CASCADE;
DROP TABLE IF EXISTS public.cas_ii_2023   CASCADE;
DROP TABLE IF EXISTS public.cas_ii_2024   CASCADE;
DROP TABLE IF EXISTS public.cas_iii_2025  CASCADE;
DROP TABLE IF EXISTS public.cas_funcional CASCADE;

-- 6) Eliminar funciones de totales huérfanas
DROP FUNCTION IF EXISTS public.calc_totales_cas_choferes();
DROP FUNCTION IF EXISTS public.calc_totales_cas_i_2025();
DROP FUNCTION IF EXISTS public.calc_totales_cas_ii_2023();
DROP FUNCTION IF EXISTS public.calc_totales_cas_ii_2024();
DROP FUNCTION IF EXISTS public.calc_totales_cas_iii_2025();
DROP FUNCTION IF EXISTS public.calc_totales_cas_funcional();

NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- REDISEÑO: columnas detalladas de obreros_necesidad_mercado + totales auto
-- Integrado desde supabase/migracion_necesidad_mercado_columnas.sql
-- Aditivo e idempotente; se ejecuta al final del consolidado.
-- =====================================================================
-- 1) Nuevas columnas
ALTER TABLE public.obreros_necesidad_mercado
  ADD COLUMN IF NOT EXISTS rem_bas               NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rem                   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rem_contrato          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS p_pacto               NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ds311_2022_ef         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ds313_2023_ef         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ds265_2024ef          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ds279_2024ef          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ds325_2024ef          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS reintegro             NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS riesgo_salud          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS f_pens                NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS p_seg                 NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS c_var                 NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS mas_vida              NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fe_salud              NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rimac_seg             NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS interseguro           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS la_positiva_seguros   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS faltas                INTEGER,
  ADD COLUMN IF NOT EXISTS r_jud                 NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS autorizado_ii_suarez  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS coop_san_miguel       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS coop_san_ch           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS coop_sta_mm           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ir_5ta_cat            NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cuota_sindical        NUMERIC(12,2);

-- 2) Función de totales (11 ingresos → t_ingreso, 15 descuentos → t_dsctos; faltas es int, no suma)
CREATE OR REPLACE FUNCTION public.calc_totales_obreros_necesidad_mercado()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $func$
BEGIN
  NEW.t_ingreso := ROUND((COALESCE(NEW.rem_bas, 0) + COALESCE(NEW.rem, 0) + COALESCE(NEW.rem_contrato, 0) + COALESCE(NEW.p_pacto, 0) + COALESCE(NEW.ds311_2022_ef, 0) + COALESCE(NEW.ds313_2023_ef, 0) + COALESCE(NEW.ds265_2024ef, 0) + COALESCE(NEW.ds279_2024ef, 0) + COALESCE(NEW.ds325_2024ef, 0) + COALESCE(NEW.reintegro, 0) + COALESCE(NEW.riesgo_salud, 0))::numeric, 2);
  NEW.t_dsctos  := ROUND((COALESCE(NEW.f_pens, 0) + COALESCE(NEW.p_seg, 0) + COALESCE(NEW.c_var, 0) + COALESCE(NEW.mas_vida, 0) + COALESCE(NEW.fe_salud, 0) + COALESCE(NEW.rimac_seg, 0) + COALESCE(NEW.interseguro, 0) + COALESCE(NEW.la_positiva_seguros, 0) + COALESCE(NEW.r_jud, 0) + COALESCE(NEW.autorizado_ii_suarez, 0) + COALESCE(NEW.coop_san_miguel, 0) + COALESCE(NEW.coop_san_ch, 0) + COALESCE(NEW.coop_sta_mm, 0) + COALESCE(NEW.ir_5ta_cat, 0) + COALESCE(NEW.cuota_sindical, 0))::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

-- 3) Trigger BEFORE INSERT/UPDATE
DROP TRIGGER IF EXISTS calc_totales_obreros_necesidad_mercado_trg ON public.obreros_necesidad_mercado;
CREATE TRIGGER calc_totales_obreros_necesidad_mercado_trg
  BEFORE INSERT OR UPDATE ON public.obreros_necesidad_mercado
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_obreros_necesidad_mercado();

NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- ÁREAS: columna area en 12 planillas + identidad (abrir_periodo/corregir)
-- Integrado desde supabase/migracion_areas_planillas.sql
-- Idempotente; se ejecuta al final del consolidado.
-- =====================================================================

-- 1) Columna area en las 12 tablas con áreas
ALTER TABLE public.obreros_permanentes         ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.obreros_plazo_indeterminado ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.obreros_mandato_judicial    ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.obreros_concurso            ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.obreros_necesidad_mercado   ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.empleados_permanentes       ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.cas_general                 ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.gerente_municipal           ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.alcalde                     ADD COLUMN IF NOT EXISTS area TEXT;
-- + 3 planillas de empleados que reciben el area "GESTION ADMINISTRATIVA"
ALTER TABLE public.empleados_contrato_plazo_indet   ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.empleados_contrato_provisional   ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.empleados_mandato_judicial_24041 ADD COLUMN IF NOT EXISTS area TEXT;

-- 2) abrir_periodo: copiar también 'area' al generar el mes siguiente
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
  EXECUTE format('INSERT INTO public.%I (periodo, %s) SELECT $1, %s FROM public.%I WHERE periodo = $2', p_tabla, v_cols, v_cols, p_tabla) USING p_periodo, v_src;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$function$;

-- 3) corregir_identidad: permitir corregir también 'area'
CREATE OR REPLACE FUNCTION public.corregir_identidad(p_tabla text, p_dni integer, p_datos jsonb)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $cor$
DECLARE
  v_allowed TEXT[] := ARRAY['apellidos_y_nombres','f_ingreso','fecha_ing','snp','area','tipo_acto_administrativo'];
  v_cols TEXT[]; v_key TEXT; v_set TEXT := ''; n INTEGER;
BEGIN
  IF (SELECT public.get_my_rol()) NOT IN ('editor', 'administrador') THEN RAISE EXCEPTION 'No autorizado'; END IF;
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
$cor$;

NOTIFY pgrst, 'reload schema';
