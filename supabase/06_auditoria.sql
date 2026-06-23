-- 06_auditoria.sql
-- Tabla de auditoría + triggers automáticos para las 19 planillas

CREATE TABLE IF NOT EXISTS public.auditoria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla       TEXT NOT NULL,
  registro_id UUID,
  accion      TEXT NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
  -- FK a public.perfiles (no a auth.users) para que PostgREST pueda embeber
  -- perfiles(nombre) en el SELECT de la página de Auditoría. perfiles.id es a
  -- su vez FK a auth.users.id, así que el valor es el mismo.
  usuario_id  UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  datos_ant   JSONB,
  datos_nue   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON public.auditoria(tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON public.auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria(created_at DESC);

-- RLS: solo administradores pueden ver el historial
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria_select_admin" ON public.auditoria
  FOR SELECT TO authenticated
  USING ((select get_my_rol()) = 'administrador');

-- Función trigger genérica
CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.auditoria (tabla, registro_id, accion, usuario_id, datos_ant, datos_nue)
  VALUES (
    TG_TABLE_NAME,
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    auth.uid(),
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NULL;
END;
$$;

-- Aplicar trigger a las 19 tablas
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'obreros_permanentes','obreros_plazo_indeterminado','obreros_mandato_judicial',
    'obreros_concurso','obreros_necesidad_mercado','empleados_permanentes',
    'empleados_contrato_plazo_indet','empleados_contrato_provisional',
    'empleados_mandato_judicial_24041','cas_general','cas_choferes','cas_i_2025',
    'cas_ii_2023','cas_ii_2024','cas_iii_2025','cas_funcional',
    'cesantes_pensionistas','gerente_municipal','alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS auditoria_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER auditoria_%s
       AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria()',
      t, t
    );
  END LOOP;
END;
$$;
