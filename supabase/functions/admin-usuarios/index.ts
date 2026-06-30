// Edge Function: admin-usuarios
// -----------------------------------------------------------------------------
// Acciones de gestión de cuentas que SOLO un ADMINISTRADOR puede ejecutar y que
// requieren la Admin API de Supabase (auth.admin.*) con la SERVICE_ROLE_KEY:
//
//   • cambiar_password  → restablece la contraseña de cualquier usuario.
//   • eliminar          → borra la cuenta (su perfil cae por ON DELETE CASCADE).
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

  if (perfilErr || perfil?.rol !== 'administrador') {
    return json({ error: 'Solo un administrador puede gestionar usuarios.' }, 403)
  }

  // ── 3) Leer la acción ──────────────────────────────────────────────────────
  let payload: { accion?: string; userId?: string; password?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'JSON inválido.' }, 400)
  }

  const accion = (payload.accion ?? '').trim()
  const userId = (payload.userId ?? '').trim()

  // ── Listar emails (no requiere userId) ─────────────────────────────────────
  // Devuelve [{ id, email }] de todos los usuarios de auth (paginado), para que
  // la lista de /usuarios pueda mostrar el correo junto al nombre.
  if (accion === 'listar') {
    const usuarios: { id: string; email: string | null }[] = []
    let page = 1
    // listUsers pagina de a 1000 como máximo; recorremos hasta vaciar.
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) return json({ error: error.message }, 400)
      for (const u of data.users) usuarios.push({ id: u.id, email: u.email ?? null })
      if (data.users.length < 1000) break
      page++
    }
    return json({ ok: true, usuarios })
  }

  if (!userId) {
    return json({ error: 'Falta el identificador del usuario.' }, 400)
  }

  // ── 4) Ejecutar la acción ──────────────────────────────────────────────────
  if (accion === 'cambiar_password') {
    const password = payload.password ?? ''
    if (password.length < 6) {
      return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400)
    }

    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) {
      return json({ error: error.message }, 400)
    }
    return json({ ok: true, accion })
  }

  if (accion === 'eliminar') {
    // Un admin no puede eliminarse a sí mismo (evita quedarse sin acceso).
    if (userId === callerId) {
      return json({ error: 'No puedes eliminar tu propia cuenta.' }, 400)
    }

    // La fila de perfiles cae sola por ON DELETE CASCADE.
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) {
      return json({ error: error.message }, 400)
    }
    return json({ ok: true, accion })
  }

  return json({ error: 'Acción no reconocida.' }, 400)
})
