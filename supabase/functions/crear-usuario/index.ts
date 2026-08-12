// Edge Function: crear-usuario
// -----------------------------------------------------------------------------
// Permite que un ADMINISTRADOR o SUPERADMIN cree cuentas (consultor / editor /
// administrador) directamente desde la app, sin entrar al panel de Supabase.
// 'superadmin' NO es un rol asignable desde aquí: esa cuenta es única y
// permanente, y solo puede existir por asignación manual directa en la base
// de datos (el trigger proteger_rol_perfil también lo bloquea a nivel de BD,
// esto es solo para devolver un error claro).
//
// Por qué una Edge Function: crear usuarios usa la Admin API
// (auth.admin.createUser), que requiere la SERVICE_ROLE_KEY. Esa clave salta
// toda la seguridad (RLS) y NUNCA puede estar en el frontend. Aquí corre en el
// servidor de Supabase, donde la clave se inyecta sola.
//
// Seguridad: la función verifica que QUIEN LLAMA sea administrador antes de
// crear nada (lee el JWT del header Authorization y consulta su perfil).
//
// Despliegue:
//   npx supabase functions deploy crear-usuario --project-ref <TU_PROJECT_REF>
// -----------------------------------------------------------------------------

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ROLES_VALIDOS = ['consultor', 'editor', 'administrador']

// Restringe CORS al origen de la app si defines ALLOWED_ORIGIN en el entorno de
// la función (Supabase → Edge Functions → Secrets). Cae a '*' si no está.
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

  // Cliente con privilegios de servicio (salta RLS). Solo en el servidor.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── 1) Identificar a quien llama desde su JWT ──────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return json({ error: 'Falta el token de autenticación.' }, 401)
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) {
    return json({ error: 'Sesión inválida.' }, 401)
  }

  // ── 2) Verificar que quien llama sea administrador ─────────────────────────
  const { data: perfil, error: perfilErr } = await admin
    .from('perfiles')
    .select('rol')
    .eq('id', userData.user.id)
    .single()

  if (perfilErr || !['administrador', 'superadmin'].includes(perfil?.rol ?? '')) {
    return json({ error: 'Solo un administrador puede crear usuarios.' }, 403)
  }

  // ── 3) Validar los datos del nuevo usuario ─────────────────────────────────
  let payload: { email?: string; password?: string; nombre?: string; rol?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'JSON inválido.' }, 400)
  }

  const email = (payload.email ?? '').trim().toLowerCase()
  const password = payload.password ?? ''
  const nombre = (payload.nombre ?? '').trim()
  const rol = (payload.rol ?? 'consultor').trim()

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'Correo electrónico inválido.' }, 400)
  }
  if (password.length < 8) {
    return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400)
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return json({ error: 'Rol inválido.' }, 400)
  }

  // ── 4) Crear el usuario (queda confirmado, puede entrar de inmediato) ───────
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: nombre || email },
  })

  if (createErr || !created?.user) {
    // Mensaje amigable para el caso más común (correo ya registrado)
    const msg = createErr?.message ?? 'No se pudo crear el usuario.'
    const status = /already|registered|exists/i.test(msg) ? 409 : 400
    return json(
      { error: /already|registered|exists/i.test(msg) ? 'Ese correo ya está registrado.' : msg },
      status,
    )
  }

  // ── 5) Fijar nombre y rol en perfiles ──────────────────────────────────────
  // El trigger handle_new_user ya creó la fila con rol 'consultor'. La
  // actualizamos al rol elegido (upsert por si el trigger no estuviera activo).
  const { error: updErr } = await admin
    .from('perfiles')
    .upsert(
      { id: created.user.id, nombre: nombre || email, rol },
      { onConflict: 'id' },
    )

  if (updErr) {
    // El usuario quedó creado pero sin el rol correcto: lo informamos para que
    // el admin lo ajuste desde la lista (no borramos la cuenta).
    return json(
      {
        warning: `Usuario creado, pero no se pudo asignar el rol: ${updErr.message}. Ajústalo desde la lista.`,
        id: created.user.id,
      },
      207,
    )
  }

  return json({
    ok: true,
    id: created.user.id,
    email,
    nombre: nombre || email,
    rol,
  })
})
