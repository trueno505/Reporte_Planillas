-- 12_fix_auditoria_y_admin.sql
-- Correctivo para dos problemas en una base de datos YA creada:
--   (1) El historial de auditoría no se ve porque la página embebe
--       perfiles(nombre) pero auditoria.usuario_id apuntaba a auth.users,
--       no a public.perfiles → PostgREST falla con PGRST200.
--   (2) El administrador no ve a los demás usuarios si 08_admin.sql
--       no se llegó a ejecutar.
-- Ejecutar este archivo completo en el SQL Editor de Supabase.

-- ─── (1) Reapuntar la FK de auditoria.usuario_id hacia public.perfiles ───────
ALTER TABLE public.auditoria
  DROP CONSTRAINT IF EXISTS auditoria_usuario_id_fkey;

ALTER TABLE public.auditoria
  ADD CONSTRAINT auditoria_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id) ON DELETE SET NULL;

-- ─── (2) Asegurar que existan las políticas de administrador (idempotente) ───
DROP POLICY IF EXISTS "perfiles_admin_select_all" ON public.perfiles;
CREATE POLICY "perfiles_admin_select_all" ON public.perfiles
  FOR SELECT TO authenticated
  USING ((select get_my_rol()) = 'administrador');

DROP POLICY IF EXISTS "perfiles_admin_update_all" ON public.perfiles;
CREATE POLICY "perfiles_admin_update_all" ON public.perfiles
  FOR UPDATE TO authenticated
  USING ((select get_my_rol()) = 'administrador')
  WITH CHECK ((select get_my_rol()) = 'administrador');

-- ─── Refrescar el caché de esquema de PostgREST (relación nueva) ─────────────
NOTIFY pgrst, 'reload schema';
