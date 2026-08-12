-- 'Vacaciones' (Empleados Permanentes) pasa de monto (NUMERIC) a texto: solo
-- admite el nombre de un mes del año, o vacío. Ya era una columna puramente
-- informativa que no se sumaba a t_ingreso (ver migracion_vacaciones_no_ingreso.sql).
--
-- Los valores numéricos que tuviera cargados (montos de una época en que se
-- usaba distinto) no representan un mes válido, así que se limpian a NULL en
-- vez de intentar convertirlos.
--
-- Idempotente; aplicar sobre una base de datos ya existente con datos.

ALTER TABLE public.empleados_permanentes
  ALTER COLUMN vacaciones TYPE TEXT USING NULL;

ALTER TABLE public.empleados_permanentes DROP CONSTRAINT IF EXISTS empleados_permanentes_vacaciones_check;
ALTER TABLE public.empleados_permanentes ADD CONSTRAINT empleados_permanentes_vacaciones_check
  CHECK (vacaciones IS NULL OR vacaciones IN (
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ));
