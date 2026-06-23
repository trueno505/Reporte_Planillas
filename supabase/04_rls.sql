-- 04_rls.sql
-- Row Level Security para todas las tablas de planillas y perfiles

-- Función helper: obtiene el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_rol()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$;

-- ─── perfiles ───────────────────────────────────────────────────────────────
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfiles_select" ON public.perfiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "perfiles_update" ON public.perfiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()));

-- ─── Macro para aplicar políticas estándar en cada tabla de planilla ────────
-- SELECT → consultor o administrador
-- INSERT / UPDATE / DELETE → solo administrador

DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'obreros_permanentes',
    'obreros_plazo_indeterminado',
    'obreros_mandato_judicial',
    'obreros_concurso',
    'obreros_necesidad_mercado',
    'empleados_permanentes',
    'empleados_contrato_plazo_indet',
    'empleados_contrato_provisional',
    'empleados_mandato_judicial_24041',
    'cas_general',
    'cas_choferes',
    'cas_i_2025',
    'cas_ii_2023',
    'cas_ii_2024',
    'cas_iii_2025',
    'cas_funcional',
    'cesantes_pensionistas',
    'gerente_municipal',
    'alcalde'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY "%s_select" ON public.%I
       FOR SELECT TO authenticated
       USING ((select get_my_rol()) IN (''consultor'', ''administrador''))',
      t, t
    );

    EXECUTE format(
      'CREATE POLICY "%s_insert" ON public.%I
       FOR INSERT TO authenticated
       WITH CHECK ((select get_my_rol()) = ''administrador'')',
      t, t
    );

    EXECUTE format(
      'CREATE POLICY "%s_update" ON public.%I
       FOR UPDATE TO authenticated
       USING ((select get_my_rol()) = ''administrador'')
       WITH CHECK ((select get_my_rol()) = ''administrador'')',
      t, t
    );

    EXECUTE format(
      'CREATE POLICY "%s_delete" ON public.%I
       FOR DELETE TO authenticated
       USING ((select get_my_rol()) = ''administrador'')',
      t, t
    );
  END LOOP;
END;
$$;
