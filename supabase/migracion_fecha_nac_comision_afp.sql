-- =====================================================================
-- Añade dos columnas al final de las 12 planillas (todas menos
-- `cesantes_pensionistas`, excluida a propósito):
--
--   · fecha_nacimiento   DATE
--   · tipo_comision_afp  TEXT   ('Comisión sobre el flujo' | 'Comisión sobre el saldo')
--
-- Ambas son datos internos: se ven y se editan en la web, y salen en las
-- plantillas de importación / actualizar columna, pero NO en el Excel de
-- descarga de la planilla (eso se controla en el front con la marca
-- `excluirExcel` de `planillas.js`, no aquí).
--
-- No tocan ningún total: no son columnas `money`, así que los triggers de
-- t_ingreso / t_dsctos / t_liquido siguen igual.
--
-- `tipo_comision_afp` se deja como TEXT libre a nivel de BD (sin CHECK) para
-- no romper cargas masivas antiguas ni bloquear un tercer valor futuro; la
-- lista cerrada se aplica en el formulario web mediante `col.opciones`.
--
-- Cómo usar: pega este archivo completo en el SQL Editor de Supabase y
-- ejecútalo UNA vez. Es idempotente: correrlo dos veces no falla.
--
-- Nota: el esquema base vive en `_migracion_completa.sql` (ya actualizado
-- para que las instalaciones nuevas creen las columnas). Este archivo es solo
-- el parche para bases de datos YA instaladas.
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
    'gerente_municipal',
    'alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format(
      'ALTER TABLE public.%I
         ADD COLUMN IF NOT EXISTS fecha_nacimiento  DATE,
         ADD COLUMN IF NOT EXISTS tipo_comision_afp TEXT', t
    );
    RAISE NOTICE 'Columnas añadidas en %', t;
  END LOOP;
END $$;

-- PostgREST cachea el esquema; sin esto la API sigue sin exponer las columnas.
NOTIFY pgrst, 'reload schema';
