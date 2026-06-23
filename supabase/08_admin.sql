-- 08_admin.sql
-- Políticas extra para que un administrador pueda gestionar usuarios desde la app

-- Permitir a un admin ver y actualizar el rol de cualquier perfil
CREATE POLICY "perfiles_admin_select_all" ON public.perfiles
  FOR SELECT TO authenticated
  USING ((select get_my_rol()) = 'administrador');

CREATE POLICY "perfiles_admin_update_all" ON public.perfiles
  FOR UPDATE TO authenticated
  USING ((select get_my_rol()) = 'administrador')
  WITH CHECK ((select get_my_rol()) = 'administrador');

-- NOTA: La creación de nuevos usuarios desde el frontend requiere
-- una Supabase Edge Function con service_role (ver supabase/functions/).
-- Alternativa más simple: usar invitaciones de Supabase Auth (invite by email).
