-- Supabase RLS setup for GHO TAB
-- 1) Asegurarse de que la tabla tenga la columna que enlaza con auth.users.id
-- En este proyecto usamos `id_auth` en `tbl_usuarios` (contiene el UID de auth.users)
ALTER TABLE public.tbl_usuarios
  ADD COLUMN IF NOT EXISTS id_auth uuid;

-- 2) Si tu tabla ya tiene `id_auth`, no ejecutes el UPDATE siguiente.
-- Si necesitas mapear por email en un paso manual, hazlo con cuidado; aquí lo dejamos comentado.
-- UPDATE public.tbl_usuarios u
-- SET id_auth = a.id
-- FROM auth.users a
-- WHERE a.email = u.email;

-- 3) Índice único para acelerar búsquedas por id_auth
CREATE UNIQUE INDEX IF NOT EXISTS idx_tbl_usuarios_id_auth ON public.tbl_usuarios(id_auth);

-- 4) Habilitar RLS en tablas relevantes
ALTER TABLE public.tbl_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tbl_flota ENABLE ROW LEVEL SECURITY;

-- 5) Políticas para tbl_usuarios
-- Permitir SELECT a quien sea 'jefe' o al propio usuario (ver su fila)
CREATE POLICY select_own_or_jefe ON public.tbl_usuarios
  FOR SELECT
  USING (
    auth.uid() = id_auth
    OR EXISTS (SELECT 1 FROM public.tbl_usuarios u2 WHERE u2.id_auth = auth.uid() AND u2.perfil = 'jefe')
  );

-- Permitir UPDATE al propio usuario o a 'jefe'
CREATE POLICY update_own_or_jefe ON public.tbl_usuarios
  FOR UPDATE
  USING (
    auth.uid() = id_auth
    OR EXISTS (SELECT 1 FROM public.tbl_usuarios u2 WHERE u2.id_auth = auth.uid() AND u2.perfil = 'jefe')
  )
  WITH CHECK (
    auth.uid() = id_auth
    OR EXISTS (SELECT 1 FROM public.tbl_usuarios u2 WHERE u2.id_auth = auth.uid() AND u2.perfil = 'jefe')
  );

-- 6) Políticas para tbl_flota
-- Permitir SELECT a cualquier usuario autenticado que exista en tbl_usuarios
CREATE POLICY select_for_authed ON public.tbl_flota
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.tbl_usuarios u WHERE u.id_auth = auth.uid())
  );

-- Permitir INSERT solo a 'jefe'
CREATE POLICY insert_only_jefe ON public.tbl_flota
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tbl_usuarios u WHERE u.id_auth = auth.uid() AND u.perfil = 'jefe')
  );

-- Permitir UPDATE solo a 'jefe'
CREATE POLICY update_only_jefe ON public.tbl_flota
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.tbl_usuarios u WHERE u.id_auth = auth.uid() AND u.perfil = 'jefe')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tbl_usuarios u WHERE u.id_auth = auth.uid() AND u.perfil = 'jefe')
  );

-- Permitir DELETE solo a 'jefe' (opcional)
CREATE POLICY delete_only_jefe ON public.tbl_flota
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.tbl_usuarios u WHERE u.id_auth = auth.uid() AND u.perfil = 'jefe')
  );

-- 7) Notas de despliegue / pruebas
-- - En Supabase Dashboard -> Authentication -> Settings: añade https://ghotab.github.io como
--   "Site URL" y en Redirect URLs agrega https://ghotab.github.io/control/tab/login.html (y otras si las usas).
-- - Ejecuta este script en SQL Editor (Run).
-- - Crea un usuario de prueba en Authentication -> Users (por ejemplo 1234567@gho.mx) y establece su contraseña.
-- - Inserta o actualiza su fila en public.tbl_usuarios con el campo 'perfil' (ej: 'jefe' o 'usuario').
--   Por ejemplo:
--     INSERT INTO public.tbl_usuarios (email, perfil) VALUES ('1234567@gho.mx','jefe') ON CONFLICT (email) DO UPDATE SET perfil='jefe';
-- - Si el INSERT anterior no tiene auth_uid, ejecuta de nuevo la query de UPDATE para mapear auth_uid.
-- - Prueba desde la app: inicia sesión con la cuenta de prueba y verifica que solo los usuarios con 'perfil' = 'jefe'
--   puedan hacer operaciones de escritura (probar desde la UI que hace INSERT/UPDATE a tbl_flota).

-- 8) Seguridad recomendada
-- - Mantén la clave anon pública en el frontend (es el modelo de Supabase), pero confía en RLS para proteger datos.
-- - Si la anon key estuvo comprometida, rota las keys en Settings -> API y actualiza el frontend.
