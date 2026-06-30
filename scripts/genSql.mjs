// Script que genera, a partir de src/config/planillas.js:
//   supabase/03_tablas.sql    → las 19 tablas
//   supabase/09_totales.sql   → triggers que calculan t_ingreso/t_dsctos/t_liquido en la BD
//   supabase/10_indices.sql   → índices GIN (pg_trgm) para la búsqueda por nombre
// Uso: node scripts/genSql.mjs

import { writeFileSync } from 'fs'
import { PLANILLAS, getSeccionesCalculo } from '../src/config/planillas.js'

function sqlType(col) {
  switch (col.type) {
    case 'dni':
      return 'INTEGER'
    case 'text':
      return 'TEXT'
    case 'date':
      return 'DATE'
    case 'int':
      return 'INTEGER'
    case 'money':
      return 'NUMERIC(12,2)'
    default:
      return 'TEXT'
  }
}

function genTable(planilla) {
  const { tabla, columnas } = planilla
  const colDefs = columnas.map((col) => {
    let def = `  ${col.key} ${sqlType(col)}`
    // El DNI ya NO es único por sí solo: la unicidad es por (dni, periodo) para
    // permitir el histórico mensual (mismo trabajador, varios meses).
    if (col.type === 'dni') def += ' NOT NULL'
    else if (col.required) def += ' NOT NULL'
    return def
  })

  return `
-- ════════════════════════════════════════
-- ${tabla}
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.${tabla} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  periodo DATE NOT NULL DEFAULT date_trunc('month', now())::date,
${colDefs.join(',\n')},
  CONSTRAINT ${tabla}_dni_periodo_key UNIQUE (dni, periodo)
);

CREATE TRIGGER handle_updated_at_${tabla}
  BEFORE UPDATE ON public.${tabla}
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE INDEX IF NOT EXISTS idx_${tabla}_periodo ON public.${tabla} (periodo);
`
}

const header = `-- ================================================================
-- 03_tablas.sql  —  Generado automáticamente por scripts/genSql.mjs
-- NO editar a mano: editar src/config/planillas.js y regenerar
-- ================================================================

`

const sql = header + PLANILLAS.map(genTable).join('\n')

writeFileSync(new URL('../supabase/03_tablas.sql', import.meta.url), sql)
console.log(`Generadas ${PLANILLAS.length} tablas → supabase/03_tablas.sql`)

// ════════════════════════════════════════════════════════════════════════════
// 09_totales.sql — triggers que calculan los totales en la BD (fuente de verdad)
// ════════════════════════════════════════════════════════════════════════════

function genTotalesTrigger(planilla) {
  const sec = getSeccionesCalculo(planilla)
  if (!sec) return null // planillas con totales manuales (sinAutoTotales)

  const suma = (keys) =>
    keys.length ? keys.map((k) => `COALESCE(NEW.${k}, 0)`).join(' + ') : '0'

  const ing = suma(sec.ingresoKeys)
  const dsc = suma(sec.descuentoKeys)
  const t = planilla.tabla

  return `
-- ${t}
CREATE OR REPLACE FUNCTION public.calc_totales_${t}()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.t_ingreso := ROUND((${ing})::numeric, 2);
  NEW.t_dsctos  := ROUND((${dsc})::numeric, 2);
  NEW.t_liquido := ROUND((NEW.t_ingreso - NEW.t_dsctos)::numeric, 2);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calc_totales_${t}_trg ON public.${t};
CREATE TRIGGER calc_totales_${t}_trg
  BEFORE INSERT OR UPDATE ON public.${t}
  FOR EACH ROW EXECUTE FUNCTION public.calc_totales_${t}();
`
}

const totalesHeader = `-- ================================================================
-- 09_totales.sql  —  Generado automáticamente por scripts/genSql.mjs
-- NO editar a mano: editar src/config/planillas.js y regenerar
--
-- Calcula t_ingreso, t_dsctos y t_liquido en la propia base de datos en cada
-- INSERT/UPDATE. La BD es la fuente de verdad: aunque el cliente envíe totales,
-- el trigger los recalcula, evitando totales inconsistentes y condiciones de
-- carrera entre ediciones simultáneas.
-- ================================================================

`

const totalesParts = PLANILLAS.map(genTotalesTrigger).filter(Boolean)
writeFileSync(
  new URL('../supabase/09_totales.sql', import.meta.url),
  totalesHeader + totalesParts.join('\n')
)
console.log(`Generados ${totalesParts.length} triggers de totales → supabase/09_totales.sql`)

// ════════════════════════════════════════════════════════════════════════════
// 10_indices.sql — índices GIN (pg_trgm) para acelerar la búsqueda por nombre
// ════════════════════════════════════════════════════════════════════════════

const indicesHeader = `-- ================================================================
-- 10_indices.sql  —  Generado automáticamente por scripts/genSql.mjs
-- NO editar a mano: editar src/config/planillas.js y regenerar
--
-- Índices trigram para que las búsquedas ILIKE '%texto%' por apellidos_y_nombres
-- (RPC buscar_trabajador) no hagan full scan en las 19 tablas.
-- Requiere la extensión pg_trgm (ver 01_extensions.sql).
-- ================================================================

`

const indicesParts = PLANILLAS.map(
  (p) =>
    `CREATE INDEX IF NOT EXISTS idx_${p.tabla}_nombre_trgm
  ON public.${p.tabla} USING gin (apellidos_y_nombres gin_trgm_ops);`
)
writeFileSync(
  new URL('../supabase/10_indices.sql', import.meta.url),
  indicesHeader + indicesParts.join('\n') + '\n'
)
console.log(`Generados ${indicesParts.length} índices trigram → supabase/10_indices.sql`)
