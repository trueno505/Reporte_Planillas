-- Restringe el rol superadmin:
--   1) Nadie (ni siquiera otro superadmin) puede crear/ascender una cuenta a
--      superadmin desde la app: el trigger proteger_rol_perfil ahora revierte
--      también los intentos de UPDATE que fijen rol = 'superadmin' cuando la
--      fila no lo era ya. Solo puede existir por asignación manual directa en
--      la base de datos. crear-usuario (Edge Function) ya no acepta 'superadmin'
--      como rol al crear cuentas (ver supabase/functions/crear-usuario/index.ts).
--   2) Un administrador (no superadmin) deja de poder ver la fila de perfiles
--      del superadmin: perfiles_admin_select_all ahora excluye rol='superadmin'
--      para quien no es superadmin. Efecto en cascada (sin cambios de código):
--        - /usuarios ya no lista la cuenta del superadmin para un administrador.
--        - admin-usuarios ('listar') se filtra también del lado del Edge
--          Function para no exponer su correo.
--        - /auditoria: el embed perfiles(nombre) respeta esta misma RLS, así
--          que las filas de auditoría generadas por el superadmin se muestran
--          con Usuario "—" en vez de su nombre.
-- Idempotente; aplicar sobre una base de datos ya existente con datos.

CREATE OR REPLACE FUNCTION public.proteger_rol_perfil()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF OLD.rol = 'superadmin' AND NEW.rol IS DISTINCT FROM OLD.rol THEN
    NEW.rol := OLD.rol;
  ELSIF NEW.rol = 'superadmin' AND OLD.rol IS DISTINCT FROM 'superadmin' THEN
    NEW.rol := OLD.rol;
  ELSIF NEW.rol IS DISTINCT FROM OLD.rol
        AND (SELECT public.get_my_rol()) NOT IN ('administrador', 'superadmin') THEN
    NEW.rol := OLD.rol;
  END IF;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "perfiles_admin_select_all" ON public.perfiles;
CREATE POLICY "perfiles_admin_select_all" ON public.perfiles
  FOR SELECT TO authenticated
  USING (
    (select get_my_rol()) = 'superadmin'
    OR ((select get_my_rol()) = 'administrador' AND rol <> 'superadmin')
  );
