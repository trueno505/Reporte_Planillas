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
