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
CREATE OR REPLACE VIEW public.vw_dni_todos AS
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
