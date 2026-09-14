-- ============================================================================
-- vaciar_trabajadores_y_auditoria.sql
-- ----------------------------------------------------------------------------
-- Deja la base "en blanco" para empezar de nuevo:
--   1) borra TODOS los trabajadores de las 13 planillas (todos los periodos),
--   2) limpia dni_registro (el indice global de DNIs),
--   3) vacia la auditoria COMPLETA.
--
-- NO toca: perfiles (las cuentas de usuario), parametros_aportes, ni el esquema.
--
-- Orden y detalles que importan:
--   · TRUNCATE no dispara triggers de fila, asi que ni registrar_auditoria()
--     ni proteger_periodo_cerrado() se meten en el camino. Por eso hay que
--     limpiar dni_registro a mano (normalmente lo mantiene el trigger DELETE).
--   · La auditoria se vacia AL FINAL: si se vaciara primero, cualquier borrado
--     posterior volveria a llenarla.
--   · Todo en una transaccion: o se hace entero, o no se hace nada.
--
-- ESTO NO SE PUEDE DESHACER. Hay un respaldo previo en
-- backups/respaldo_trabajadores_2026-08-22.json
-- ============================================================================

BEGIN;

-- 1) Las 13 planillas
TRUNCATE TABLE
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
  public.cesantes_pensionistas,
  public.gerente_municipal,
  public.alcalde;

-- 2) Indice global de DNIs (queda huerfano tras el TRUNCATE)
TRUNCATE TABLE public.dni_registro;

-- 3) Historial de cambios, al final
TRUNCATE TABLE public.auditoria;

COMMIT;

-- Verificacion (deberia devolver 0 en las tres)
SELECT
  (SELECT count(*) FROM public.auditoria)     AS auditoria,
  (SELECT count(*) FROM public.dni_registro)  AS dni_registro,
  (SELECT count(*) FROM public.obreros_permanentes) AS obreros_permanentes;
