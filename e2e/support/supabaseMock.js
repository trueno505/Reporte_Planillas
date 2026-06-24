// Intercepta TODO el tráfico hacia Supabase (auth, REST, RPC y realtime) para
// que los e2e corran en un navegador real pero sin backend ni credenciales.
//
// - Siembra una sesión de admin en localStorage (antes de cargar la página).
// - Responde el perfil con rol 'administrador' (para ver los botones de admin).
// - Devuelve filas fijas para la planilla.
// - Captura las llamadas al RPC actualizar_columna_planilla para poder afirmarlas.

// Project ref tomado de VITE_SUPABASE_URL (…/lsmraamhhuccrhslwrtg.supabase.co)
const PROJECT_REF = 'lsmraamhhuccrhslwrtg'
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`
const USER_ID = '00000000-0000-0000-0000-000000000001'

const SESSION = {
  access_token: 'fake-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800, // año 2100 → nunca expira durante el test
  refresh_token: 'fake-refresh-token',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@test.local',
    app_metadata: { provider: 'email' },
    user_metadata: {},
  },
}

const PERFIL = { id: USER_ID, nombre: 'Admin Test', rol: 'administrador' }

// Filas por defecto de la planilla cas_general (solo lo que usa la UI).
export const DEFAULT_ROWS = [
  { id: 1, dni: 111, apellidos_y_nombres: 'PEREZ JUAN', r_basica: 100, t_ingreso: 100, t_dsctos: 0, t_liquido: 100 },
  { id: 2, dni: 222, apellidos_y_nombres: 'GOMEZ ANA', r_basica: 200, t_ingreso: 200, t_dsctos: 0, t_liquido: 200 },
]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
}

function json(body) {
  return {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/**
 * Configura todos los mocks de Supabase en una página de Playwright.
 * @returns {{ rpcCalls: Array<object> }} rpcCalls se va llenando con los bodies
 *   enviados al RPC actualizar_columna_planilla.
 */
export async function mockSupabase(page, { tabla = 'cas_general', rows = DEFAULT_ROWS } = {}) {
  const rpcCalls = []

  // 1) Sembrar la sesión antes de que cargue cualquier script de la página.
  await page.addInitScript(
    ([key, session]) => window.localStorage.setItem(key, JSON.stringify(session)),
    [STORAGE_KEY, SESSION]
  )

  const preflight = (route, payload) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill(payload)

  // 2) RPC de actualización de columna.
  await page.route('**/rest/v1/rpc/actualizar_columna_planilla**', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    try { rpcCalls.push(JSON.parse(route.request().postData() || '{}')) } catch { /* noop */ }
    return route.fulfill(json(rpcCalls[rpcCalls.length - 1]?.p_valores?.length ?? 0))
  })

  // 3) Perfil del usuario (.single() → objeto).
  await page.route('**/rest/v1/perfiles**', (route) => preflight(route, json(PERFIL)))

  // 4) Filas de la planilla.
  await page.route(`**/rest/v1/${tabla}**`, (route) => preflight(route, json(rows)))

  // 5) Endpoints de auth (por si gotrue valida el usuario/refresca token).
  await page.route('**/auth/v1/**', (route) => preflight(route, json({ ...SESSION, ...SESSION.user })))

  // 6) Realtime: interceptar el WebSocket y no conectarlo a ningún servidor real.
  await page.routeWebSocket('**/realtime/v1/**', () => { /* swallow */ })

  return { rpcCalls }
}
