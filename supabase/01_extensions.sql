-- 01_extensions.sql
-- Extensiones requeridas por el proyecto

-- Actualiza automáticamente la columna updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Búsqueda por similitud / ILIKE acelerada con índices GIN (ver 10_indices.sql)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
