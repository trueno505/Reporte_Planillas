import { describe, it, expect, vi } from 'vitest'
import { crearCache } from './cache'

describe('crearCache', () => {
  it('pide una sola vez y reutiliza el valor', async () => {
    const c = crearCache()
    const fetcher = vi.fn().mockResolvedValue('valor')
    expect(await c.get('k', fetcher)).toBe('valor')
    expect(await c.get('k', fetcher)).toBe('valor')
    expect(await c.get('k', fetcher)).toBe('valor')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('comparte la promesa en vuelo: 5 llamadas simultáneas = 1 consulta', async () => {
    const c = crearCache()
    let resolver
    const fetcher = vi.fn(() => new Promise((r) => { resolver = r }))
    const todas = Promise.all([1, 2, 3, 4, 5].map(() => c.get('k', fetcher)))
    resolver('x')
    expect(await todas).toEqual(['x', 'x', 'x', 'x', 'x'])
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('separa por clave', async () => {
    const c = crearCache()
    const f = vi.fn((v) => Promise.resolve(v))
    expect(await c.get('a', () => f('A'))).toBe('A')
    expect(await c.get('b', () => f('B'))).toBe('B')
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('invalidar obliga a volver a pedir', async () => {
    const c = crearCache()
    const fetcher = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2')
    expect(await c.get('k', fetcher)).toBe('v1')
    c.invalidar('k')
    expect(await c.get('k', fetcher)).toBe('v2')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('invalida por prefijo', async () => {
    const c = crearCache()
    await c.get('planilla:a', () => Promise.resolve(1))
    await c.get('planilla:b', () => Promise.resolve(2))
    await c.get('otro:c', () => Promise.resolve(3))
    c.invalidar('planilla:', { porPrefijo: true })
    expect(c._tamano()).toBe(1)
  })

  it('caduca al vencer el TTL', async () => {
    vi.useFakeTimers()
    const c = crearCache({ ttlMs: 1000 })
    const fetcher = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2')
    expect(await c.get('k', fetcher)).toBe('v1')
    vi.advanceTimersByTime(1500)
    expect(await c.get('k', fetcher)).toBe('v2')
    vi.useRealTimers()
  })

  it('un fallo no deja la clave pegada: el siguiente intento reintenta', async () => {
    const c = crearCache()
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('red caída'))
      .mockResolvedValueOnce('ok')
    await expect(c.get('k', fetcher)).rejects.toThrow('red caída')
    expect(await c.get('k', fetcher)).toBe('ok')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('no cachea el error', async () => {
    const c = crearCache()
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(c.get('k', fetcher)).rejects.toThrow()
    await expect(c.get('k', fetcher)).rejects.toThrow()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(c._tamano()).toBe(0)
  })

  it('limpiar vacía todo', async () => {
    const c = crearCache()
    await c.get('a', () => Promise.resolve(1))
    await c.get('b', () => Promise.resolve(2))
    c.limpiar()
    expect(c._tamano()).toBe(0)
  })
})
