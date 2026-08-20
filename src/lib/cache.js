/**
 * Caché en memoria para consultas de solo lectura que se repiten.
 *
 * Resuelve dos derroches distintos:
 *  1. **Repetición**: volver a una pantalla vuelve a pedir lo mismo a Supabase.
 *  2. **Estampida**: dos componentes que montan a la vez disparan la misma
 *     consulta dos veces. Aquí comparten la promesa en vuelo.
 *
 * NO sirve para datos que cambian con cada edición (importes, totales): esos
 * deben leerse siempre frescos o mostrarían cifras viejas. Úsalo solo para
 * datos estables (catálogos, listas de meses, parámetros) y **invalida
 * explícitamente** cuando una mutación los deja obsoletos.
 */
export function crearCache({ ttlMs = 5 * 60 * 1000, nombre = 'cache' } = {}) {
  const store = new Map() // clave → { at, valor }
  const enVuelo = new Map() // clave → Promise

  const vigente = (e) => e && Date.now() - e.at < ttlMs

  return {
    nombre,

    /**
     * Devuelve el valor cacheado o lo pide con `fetcher`.
     * Si ya hay una petición en curso para esa clave, se engancha a ella.
     */
    async get(clave, fetcher) {
      const e = store.get(clave)
      if (vigente(e)) return e.valor

      const encurso = enVuelo.get(clave)
      if (encurso) return encurso

      const p = (async () => {
        try {
          const valor = await fetcher()
          store.set(clave, { at: Date.now(), valor })
          return valor
        } finally {
          // Se libera pase lo que pase: si falló, el siguiente intento reintenta
          // en vez de quedarse pegado a una promesa rechazada.
          enVuelo.delete(clave)
        }
      })()

      enVuelo.set(clave, p)
      return p
    },

    /** Olvida una clave exacta, o todas las que empiecen por `prefijo`. */
    invalidar(claveOPrefijo, { porPrefijo = false } = {}) {
      if (!porPrefijo) {
        store.delete(claveOPrefijo)
        enVuelo.delete(claveOPrefijo)
        return
      }
      for (const k of [...store.keys()]) {
        if (k.startsWith(claveOPrefijo)) store.delete(k)
      }
      for (const k of [...enVuelo.keys()]) {
        if (k.startsWith(claveOPrefijo)) enVuelo.delete(k)
      }
    },

    limpiar() {
      store.clear()
      enVuelo.clear()
    },

    /** Solo para tests / diagnóstico. */
    _tamano() {
      return store.size
    },
  }
}
