-- =====================================================================
-- Renombra la columna `observaciones` → `tipo_acto_administrativo`
-- en las 19 planillas, PRESERVANDO los datos existentes.
--
-- Cómo usar: pega este archivo completo en el SQL Editor de Supabase y
-- ejecútalo UNA vez. Es idempotente: si ya se renombró (o la columna no
-- existe) simplemente no hace nada, así que correrlo dos veces no falla.
--
-- Nota: el esquema base vive en `_migracion_completa.sql` (ya actualizado
-- para que las instalaciones nuevas creen la columna con el nombre nuevo).
-- Este archivo es solo el parche para bases de datos YA instaladas.
-- =====================================================================

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
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
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'observaciones'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'tipo_acto_administrativo'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I RENAME COLUMN observaciones TO tipo_acto_administrativo', t
      );
      RAISE NOTICE 'Renombrada en %', t;
    END IF;
  END LOOP;
END $$;
