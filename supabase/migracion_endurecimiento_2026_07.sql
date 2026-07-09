-- ============================================================================
-- Endurecimiento post-auditoría (2026-07-09)
-- Ejecutar en Supabase → SQL Editor. Idempotente: se puede re-ejecutar.
-- Estos mismos cambios ya están fusionados en _migracion_completa.sql
-- (para instalaciones desde cero); este archivo aplica el delta a la BD viva.
-- ============================================================================

-- B-1: get_my_rol() devuelve NULL sin sesión, pero no hay razón para
--      exponerla a anon (lint 0028_anon_security_definer_function_executable).
REVOKE EXECUTE ON FUNCTION public.get_my_rol() FROM anon, public;

-- B-2: mover extensiones fuera de `public` (lint 0014_extension_in_public).
--      Los triggers (moddatetime) y los índices GIN (pg_trgm) existentes siguen
--      funcionando sin cambios: referencian la extensión por OID, no por nombre.
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION moddatetime SET SCHEMA extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
