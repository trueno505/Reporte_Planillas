// Política de contraseñas — ÚNICA fuente de verdad del frontend.
//
// Debe coincidir con la validación de las Edge Functions
// (`supabase/functions/crear-usuario` y `admin-usuarios`, que rechazan con 400
// cualquier contraseña de menos de PASSWORD_MIN caracteres). Antes el frontend
// pedía 6 y el servidor 8, así que una clave de 6-7 pasaba la validación del
// formulario y luego el servidor la rechazaba.

export const PASSWORD_MIN = 8

/**
 * Valida una contraseña nueva.
 * @returns {string|null} mensaje de error, o null si es válida.
 */
export function validarPassword(password, repetir = undefined) {
  if ((password ?? '').length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`
  }
  if (repetir !== undefined && password !== repetir) {
    return 'Las contraseñas no coinciden.'
  }
  return null
}
