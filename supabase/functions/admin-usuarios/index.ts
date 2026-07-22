// Edge Function: admin-usuarios
// -----------------------------------------------------------------------------
// Acciones de gestión de cuentas que SOLO un ADMINISTRADOR o SUPERADMIN puede
// ejecutar y que requieren la Admin API de Supabase (auth.admin.*) con la
// SERVICE_ROLE_KEY:
//
//   • listar            → devuelve [{ id, email, banned_until }] de los usuarios.
//   • cambiar_password  → restablece la contraseña de cualquier usuario.
//   • desactivar        → inhabilita la cuenta (ban): no podrá iniciar sesión.
//   • activar           → reactiva una cuenta desactivada.
//
// No se borran cuentas: desactivar conserva el usuario, su perfil y su rastro en
// la auditoría, y permite reactivarlo después.
//
// Por qué una Edge Function: la SERVICE_ROLE_KEY salta toda la seguridad (RLS) y
// NUNCA puede vivir en el frontend. Aquí corre en el servidor de Supabase, donde
// la clave se inyecta sola. Hermana de `crear-usuario`.
//
// Seguridad: verifica que QUIEN LLAMA sea administrador (lee el JWT del header
// Authorization y consulta su perfil) antes de hacer nada.
//
// Despliegue:
//   npx supabase functions deploy admin-usuarios --project-ref <TU_PROJECT_REF>
// -----------------------------------------------------------------------------

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Duración del "ban" para desactivar (efectivamente permanente hasta reactivar).
const BAN_LARGO = '876000h' // ~100 años

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
  const callerId = userData.user.id

  // ── 2) Verificar que quien llama sea administrador ─────────────────────────
  const { data: perfil, error: perfilErr } = await admin
    .from('perfiles')
    .select('rol')
    .eq('id', callerId)
    .single()

  if (perfilErr || !['administrador', 'superadmin'].includes(perfil?.rol ?? '')) {
    return json({ error: 'Solo un administrador puede gestionar usuarios.' }, 403)
  }
  const callerRol = perfil.rol

  // ── 3) Leer la acción ──────────────────────────────────────────────────────
  let payload: { accion?: string; userId?: string; password?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'JSON inválido.' }, 400)
  }

  const accion = (payload.accion ?? '').trim()
  const userId = (payload.userId ?? '').trim()

  // ── Listar usuarios (no requiere userId) ───────────────────────────────────
  // Devuelve [{ id, email, banned_until }] de todos los usuarios de auth
  // (paginado), para poblar la lista de /usuarios con correo y estado.
  if (accion === 'listar') {
    const usuarios: { id: string; email: string | null; banned_until: string | null }[] = []
    let page = 1
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) return json({ error: error.message }, 400)
      for (const u of data.users) {
        usuarios.push({
          id: u.id,
          email: u.email ?? null,
          // banned_until existe en el objeto user de GoTrue aunque el tipo no lo declare.
          banned_until: (u as { banned_until?: string | null }).banned_until ?? null,
        })
      }
      if (data.users.length < 1000) break
      page++
    }
    return json({ ok: true, usuarios })
  }

  if (!userId) {
    return json({ error: 'Falta el identificador del usuario.' }, 400)
  }

  // ── 3.5) La cuenta superadmin nunca se activa/desactiva, y solo un superadmin
  //         puede (des)activar la cuenta de un administrador (defensa en
  //         profundidad: la BD ya bloquea el ban de un superadmin a nivel de
  //         trigger, pero solo esta función conoce quién llama).
  if (accion === 'desactivar' || accion === 'activar') {
    const { data: objetivo } = await admin
      .from('perfiles')
      .select('rol')
      .eq('id', userId)
      .single()

    if (objetivo?.rol === 'superadmin') {
      return json({ error: 'La cuenta superadmin no se puede desactivar ni reactivar.' }, 400)
    }
    if (objetivo?.rol === 'administrador' && callerRol !== 'superadmin') {
      return json({ error: 'Solo un superadmin puede activar o desactivar la cuenta de un administrador.' }, 403)
    }
  }

  // ── 4) Ejecutar la acción ──────────────────────────────────────────────────
  if (accion === 'cambiar_password') {
    const password = payload.password ?? ''
    if (password.length < 8) {
      return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400)
    }

    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) {
      return json({ error: error.message }, 400)
    }
    return json({ ok: true, accion })
  }

  if (accion === 'desactivar') {
    // Un admin no puede desactivarse a sí mismo (evita quedarse sin acceso).
    if (userId === callerId) {
      return json({ error: 'No puedes desactivar tu propia cuenta.' }, 400)
    }
    // ban_duration inhabilita el inicio de sesión sin borrar la cuenta.
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_LARGO })
    if (error) {
      return json({ error: error.message }, 400)
    }
    return json({ ok: true, accion })
  }

  if (accion === 'activar') {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    if (error) {
      return json({ error: error.message }, 400)
    }
    return json({ ok: true, accion })
  }

  return json({ error: 'Acción no reconocida.' }, 400)
})
