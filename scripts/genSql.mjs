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

  // Aportes previsionales: solo en las planillas que tienen las columnas
  // necesarias (las 12 que no son cesantes). Se calculan DESPUÉS de t_ingreso
  // —que es su base— y ANTES de t_dsctos, para que la suma de descuentos ya
  // incluya los montos recién calculados.
  const tiene = (k) => planilla.columnas.some((c) => c.key === k)
  const conAportes =
    ['afiliacion', 'tipo_comision_afp', 'descuento_snp', 'f_pens', 'p_seg', 'c_var'].every(tiene)

  // Cuando la afiliación no se reconoce, calcular_aportes_pension devuelve las
  // cuatro columnas en NULL; el COALESCE hace que se conserve el valor que ya
  // traía la fila. Así no hace falta ni IF ni variables declaradas.
  const bloqueAportes = conAportes
    ? `
  -- Aportes previsionales (ONP / AFP) sobre el Total de Ingresos. Los
  -- porcentajes viven en public.parametros_aportes y los edita el superadmin.
  -- Afiliación no reconocible ('SI'/'NO', vacío…) → devuelve NULLs y el
  -- COALESCE deja los montos como estaban.
  SELECT COALESCE(ap.descuento_snp, NEW.descuento_snp),
         COALESCE(ap.f_pens,        NEW.f_pens),
         COALESCE(ap.p_seg,         NEW.p_seg),
         COALESCE(ap.c_var,         NEW.c_var)
    INTO NEW.descuento_snp, NEW.f_pens, NEW.p_seg, NEW.c_var
    FROM public.calcular_aportes_pension(NEW.afiliacion, NEW.tipo_comision_afp, NEW.t_ingreso) ap;
`
    : ''

  return `
-- ${t}
CREATE OR REPLACE FUNCTION public.calc_totales_${t}()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $func$
BEGIN
  NEW.t_ingreso := ROUND((${ing})::numeric, 2);
${bloqueAportes}
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
  ON public.${p.tabla} USING gin (apellidos_y_nombres extensions.gin_trgm_ops);`
)
writeFileSync(
  new URL('../supabase/10_indices.sql', import.meta.url),
  indicesHeader + indicesParts.join('\n') + '\n'
)
console.log(`Generados ${indicesParts.length} índices trigram → supabase/10_indices.sql`)
