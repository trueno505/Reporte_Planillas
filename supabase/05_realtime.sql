-- 05_realtime.sql
-- Habilitar Realtime en las 19 tablas de planillas

ALTER TABLE public.obreros_permanentes           REPLICA IDENTITY FULL;
ALTER TABLE public.obreros_plazo_indeterminado   REPLICA IDENTITY FULL;
ALTER TABLE public.obreros_mandato_judicial      REPLICA IDENTITY FULL;
ALTER TABLE public.obreros_concurso              REPLICA IDENTITY FULL;
ALTER TABLE public.obreros_necesidad_mercado     REPLICA IDENTITY FULL;
ALTER TABLE public.empleados_permanentes         REPLICA IDENTITY FULL;
ALTER TABLE public.empleados_contrato_plazo_indet REPLICA IDENTITY FULL;
ALTER TABLE public.empleados_contrato_provisional REPLICA IDENTITY FULL;
ALTER TABLE public.empleados_mandato_judicial_24041 REPLICA IDENTITY FULL;
ALTER TABLE public.cas_general                   REPLICA IDENTITY FULL;
ALTER TABLE public.cas_choferes                  REPLICA IDENTITY FULL;
ALTER TABLE public.cas_i_2025                    REPLICA IDENTITY FULL;
ALTER TABLE public.cas_ii_2023                   REPLICA IDENTITY FULL;
ALTER TABLE public.cas_ii_2024                   REPLICA IDENTITY FULL;
ALTER TABLE public.cas_iii_2025                  REPLICA IDENTITY FULL;
ALTER TABLE public.cas_funcional                 REPLICA IDENTITY FULL;
ALTER TABLE public.cesantes_pensionistas         REPLICA IDENTITY FULL;
ALTER TABLE public.gerente_municipal             REPLICA IDENTITY FULL;
ALTER TABLE public.alcalde                       REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.obreros_permanentes,
  public.obreros_plazo_indeterminado,
  public.obreros_mandato_judicial,
  public.obreros_concurso,
  public.obreros_necesidad_mercado,
  public.empleados_permanentes,
  public.empleados_contrato_plazo_indet,
  public.empleados_contrato_provisional,
  public.empleados_mandato_judicial_24041,
  public.cas_general,
  public.cas_choferes,
  public.cas_i_2025,
  public.cas_ii_2023,
  public.cas_ii_2024,
  public.cas_iii_2025,
  public.cas_funcional,
  public.cesantes_pensionistas,
  public.gerente_municipal,
  public.alcalde;
