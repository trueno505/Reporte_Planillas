// Genera las capturas de pantalla para el PDF de presentación.
//
// IMPORTANTE: corre contra un Supabase SIMULADO con datos ficticios, nunca
// contra la base real. El PDF está pensado para compartirse, y las planillas
// reales contienen datos personales (nombres, DNI y remuneraciones de
// trabajadores municipales) que no deben salir de la entidad.
//
// Uso:
//   npm run preview -- --port 4173     (en otra terminal)
//   node scripts/capturas-pitch.mjs
//
// Las imágenes quedan en docs/pitch/capturas/.

import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = resolve(RAIZ, 'docs/pitch/capturas')
const BASE = process.env.BASE_URL ?? 'http://localhost:4173'

const PROJECT_REF = 'lsmraamhhuccrhslwrtg'
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`
const USER_ID = '00000000-0000-0000-0000-000000000001'
const PERIODO = '2026-08-01'

const SESSION = {
  access_token: 'demo', token_type: 'bearer', expires_in: 3600,
  expires_at: 4102444800, refresh_token: 'demo',
  user: {
    id: USER_ID, aud: 'authenticated', role: 'authenticated',
    email: 'demo@muni-sheets.pe', app_metadata: { provider: 'email' }, user_metadata: {},
  },
}

const PERFIL = { id: USER_ID, nombre: 'María Quispe', rol: 'administrador', celular: '987654321', created_at: '2026-01-15T10:00:00Z' }

const AREAS = [
  'GERENCIAR RECURSOS MATERIALES, HUMANOS Y FINANCIEROS - G. A',
  'PATRULLAJE MUNICIPAL POR SECTOR - SERENAZGO',
  'RECOLECCION Y TRANSPORTE DE RESIDUOS SOLIDOS MUNICIPALES - L.P',
]

// Personas ficticias. Cualquier parecido con la realidad es casualidad.
const PERSONAS = [
  ['ALVARADO MENDOZA, Carmen Rosa', 41203877, 'Especialista Administrativo', 3850, 0],
  ['BERNAOLA TIPISMANA, Julio César', 21455190, 'Técnico Administrativo', 3120, 1],
  ['CHIRINOS VALDIVIA, Rosa Elena', 40877211, 'Asistente Social', 2980, 0],
  ['DELGADO PACHECO, Miguel Ángel', 22190455, 'Operario de Limpieza', 2450, 2],
  ['ESPINOZA HUAMÁN, Lucía Beatriz', 43021988, 'Secretaria', 2680, 0],
  ['FERNÁNDEZ CANALES, Óscar Iván', 21877340, 'Sereno Municipal', 2530, 0],
  ['GUTIÉRREZ SALAS, Ana María', 42551903, 'Contadora', 4200, 0],
  ['HINOSTROZA RÍOS, Pedro Pablo', 21344870, 'Chofer', 2740, 1],
  ['IZAGUIRRE PONCE, Silvia Nataly', 44120876, 'Abogada', 4550, 0],
  ['JIMÉNEZ ALTAMIRANO, Raúl Enrique', 22087551, 'Jardinero', 2380, 0],
  ['LOAYZA MERCADO, Patricia Isabel', 41990233, 'Analista de Presupuesto', 3960, 0],
  ['MAMANI CONDORI, José Antonio', 43877120, 'Operario de Parques', 2410, 3],
]

const FILAS = PERSONAS.map(([nombre, dni, cargo, basica, faltas], i) => {
  const r_basica = basica
  const r_reunif = Math.round(basica * 0.08)
  const b_familiar = 102.5
  const inc_10_23 = 150
  const t_ingreso = r_basica + r_reunif + b_familiar + inc_10_23
  const f_pens = Math.round(t_ingreso * 0.10 * 100) / 100
  const p_seg = Math.round(t_ingreso * 0.0136 * 100) / 100
  const c_var = Math.round(t_ingreso * 0.0155 * 100) / 100
  const seg_rimac = i % 3 === 0 ? 58.5 : 0
  const cuota_sindical = i % 2 === 0 ? 25 : 0
  const t_dsctos = Math.round((f_pens + p_seg + c_var + seg_rimac + cuota_sindical) * 100) / 100
  return {
    id: i + 1, dni, apellidos_y_nombres: nombre, cargo,
    fecha_ing: `20${10 + (i % 12)}-0${(i % 8) + 1}-1${i % 9}`,
    niv_rem: `SPE-${(i % 5) + 1}`, afiliacion: i % 3 === 0 ? 'ONP' : 'AFP Integra',
    area: AREAS[i % AREAS.length], vacaciones: i === 2 ? 'Marzo' : null,
    r_basica, r_reunif, b_familiar, inc_10_23, faltas,
    t_ingreso, f_pens, p_seg, c_var, seg_rimac, cuota_sindical, t_dsctos,
    t_liquido: Math.round((t_ingreso - t_dsctos) * 100) / 100,
    tipo_acto_administrativo: i % 4 === 0 ? 'R.G.A. N° 214-2026-GA-MPI' : 'Contrato D.L. 276',
    periodo: PERIODO,
  }
})

const RESUMEN = [
  ['obreros_permanentes', 48], ['obreros_plazo_indeterminado', 31],
  ['obreros_mandato_judicial', 12], ['obreros_concurso', 9],
  ['obreros_necesidad_mercado', 17], ['empleados_permanentes', 64],
  ['empleados_contrato_plazo_indet', 22], ['empleados_contrato_provisional', 14],
  ['empleados_mandato_judicial_24041', 7], ['cas_general', 86],
  ['cesantes_pensionistas', 53], ['gerente_municipal', 1], ['alcalde', 1],
].map(([tabla, n]) => {
  const suma_ingreso = n * 3180.44
  const suma_dsctos = suma_ingreso * 0.134
  return {
    tabla, n_registros: n,
    suma_ingreso: Math.round(suma_ingreso * 100) / 100,
    suma_dsctos: Math.round(suma_dsctos * 100) / 100,
    suma_liquido: Math.round((suma_ingreso - suma_dsctos) * 100) / 100,
  }
})

const PERFILES = [
  PERFIL,
  { id: 'u2', nombre: 'Jorge Ramírez', rol: 'editor', created_at: '2026-02-03T10:00:00Z' },
  { id: 'u3', nombre: 'Elena Ccahuana', rol: 'editor', created_at: '2026-03-11T10:00:00Z' },
  { id: 'u4', nombre: 'Luis Farfán', rol: 'consultor', created_at: '2026-04-22T10:00:00Z' },
  { id: 'u5', nombre: 'Sofía Neyra', rol: 'consultor', created_at: '2026-05-08T10:00:00Z' },
]

const AUDITORIA = [
  ['empleados_permanentes', 'UPDATE', 'Jorge Ramírez', 41203877, 'ALVARADO MENDOZA, Carmen Rosa', '2026-08-11T14:32:00Z'],
  ['cas_general', 'INSERT', 'María Quispe', 43021988, 'ESPINOZA HUAMÁN, Lucía Beatriz', '2026-08-11T11:15:00Z'],
  ['obreros_permanentes', 'GENERACION', 'María Quispe', 22190455, 'DELGADO PACHECO, Miguel Ángel', '2026-08-01T08:02:00Z'],
  ['obreros_permanentes', 'GENERACION', 'María Quispe', 21344870, 'HINOSTROZA RÍOS, Pedro Pablo', '2026-08-01T08:02:00Z'],
  ['cesantes_pensionistas', 'UPDATE', 'Elena Ccahuana', 21455190, 'BERNAOLA TIPISMANA, Julio César', '2026-07-29T16:44:00Z'],
  ['empleados_permanentes', 'DELETE', 'María Quispe', 44120876, 'IZAGUIRRE PONCE, Silvia Nataly', '2026-07-28T09:20:00Z'],
].map(([tabla, accion, nombre, dni, ayn, created_at], i) => ({
  id: i + 1, tabla, accion, created_at, registro_id: `r${i}`,
  perfiles: { nombre },
  datos_nue: { dni, apellidos_y_nombres: ayn }, datos_ant: null,
}))

const CORS = {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': '*',
}
const json = (body, extra = {}) => ({
  status: 200, headers: { ...CORS, 'Content-Type': 'application/json', ...extra },
  body: JSON.stringify(body),
})

async function montarMocks(page) {
  await page.addInitScript(
    ([k, s]) => window.localStorage.setItem(k, JSON.stringify(s)),
    [STORAGE_KEY, SESSION]
  )
  const pre = (route, payload) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill(payload)

  // OJO: Playwright evalúa las rutas en orden INVERSO al de registro (la última
  // registrada gana). Los catch-all van PRIMERO para que los patrones
  // específicos de abajo tengan prioridad.
  await page.route('**/rest/v1/**', (r) => pre(r, json([])))
  await page.route('**/auth/v1/**', (r) => pre(r, json({ ...SESSION, ...SESSION.user })))

  await page.route('**/rest/v1/rpc/periodos_planilla**', (r) =>
    pre(r, json([{ periodo: PERIODO }, { periodo: '2026-07-01' }, { periodo: '2026-06-01' }])))
  await page.route('**/rest/v1/rpc/resumen_planillas**', (r) => pre(r, json(RESUMEN)))
  await page.route('**/rest/v1/rpc/buscar_trabajador**', (r) =>
    pre(r, json([
      { tabla: 'empleados_permanentes', slug: 'empleados-permanentes', dni: 41203877,
        apellidos_y_nombres: 'ALVARADO MENDOZA, Carmen Rosa', t_liquido: 3612.4 },
      { tabla: 'cas_general', slug: 'cas-general', dni: 41203877,
        apellidos_y_nombres: 'ALVARADO MENDOZA, Carmen Rosa', t_liquido: 2890.1 },
    ])))
  await page.route('**/rest/v1/auditoria**', (r) => pre(r, json(AUDITORIA)))
  await page.route('**/rest/v1/perfiles**', (r) => {
    const url = r.request().url()
    // .single() para el perfil propio; lista completa en /usuarios
    return pre(r, json(url.includes('id=eq.') ? PERFIL : PERFILES))
  })
  await page.route('**/functions/v1/admin-usuarios**', (r) =>
    pre(r, json({ ok: true, usuarios: PERFILES.map((p, i) => ({
      id: p.id, email: ['maria.quispe', 'jorge.ramirez', 'elena.ccahuana', 'luis.farfan', 'sofia.neyra'][i] + '@muni-sheets.pe',
      banned_until: i === 4 ? '2125-01-01T00:00:00Z' : null,
    })) })))
  await page.route('**/rest/v1/empleados_permanentes**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS })
    const url = new URL(r.request().url())
    const off = Number(url.searchParams.get('offset') ?? 0)
    const lim = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : FILAS.length
    const slice = FILAS.slice(off, off + lim)
    return r.fulfill(json(slice, { 'Content-Range': `${off}-${off + slice.length - 1}/${FILAS.length}` }))
  })
  await page.routeWebSocket('**/realtime/v1/**', () => {})
}

const capturas = []
async function capturar(page, nombre, url, prep) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
  if (prep) await prep(page)
  await page.waitForTimeout(700)
  const file = resolve(SALIDA, `${nombre}.png`)
  await page.screenshot({ path: file, fullPage: false })
  capturas.push(nombre)
  console.log(`  ✓ ${nombre}.png`)
}

const main = async () => {
  mkdirSync(SALIDA, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'es-PE',
  })
  const page = await ctx.newPage()
  await montarMocks(page)

  console.log('Capturando pantallas (datos ficticios)…')

  // Login: sin sesión sembrada.
  const ctxLimpio = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'es-PE',
  })
  const pLogin = await ctxLimpio.newPage()
  await pLogin.route('**/auth/v1/**', (r) => r.fulfill(json({})))
  await pLogin.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await pLogin.waitForTimeout(600)
  await pLogin.screenshot({ path: resolve(SALIDA, '01-login.png') })
  capturas.push('01-login')
  console.log('  ✓ 01-login.png')
  await ctxLimpio.close()

  await capturar(page, '02-dashboard', '/dashboard')
  await capturar(page, '03-planilla', '/planilla/empleados-permanentes')
  await capturar(page, '04-busqueda', '/buscar', async (p) => {
    await p.getByPlaceholder(/DNI o nombre/i).fill('41203877')
    await p.getByRole('button', { name: /Buscar/i }).click()
    await p.waitForTimeout(500)
  })
  await capturar(page, '05-nuevo-registro', '/nuevo-registro', async (p) => {
    await p.getByText('Empleados', { exact: true }).first().click().catch(() => {})
    await p.waitForTimeout(400)
  })
  await capturar(page, '06-usuarios', '/usuarios')
  await capturar(page, '07-auditoria', '/auditoria')

  await browser.close()
  console.log(`\n${capturas.length} capturas en docs/pitch/capturas/`)
}

main().catch((e) => { console.error(e); process.exit(1) })
