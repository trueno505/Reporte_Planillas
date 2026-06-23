import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useRealtime(tabla, onPayload, enabled = true) {
  const cbRef = useRef(onPayload)
  // Mantener el callback actualizado sin tocar el ref durante el render
  useEffect(() => { cbRef.current = onPayload })

  useEffect(() => {
    // enabled=false permite pausar la suscripción durante operaciones masivas
    // (importar/recalcular) para evitar una avalancha de eventos.
    if (!tabla || !enabled) return

    const channel = supabase
      .channel(`realtime:${tabla}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabla },
        (payload) => cbRef.current(payload)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tabla, enabled])
}
