-- ════════════════════════════════════════════════════════════
-- 🔒 POLÍTICAS DEL BUCKET DE SUPABASE
-- Pégalas en: Supabase Dashboard → SQL Editor → "New query" → Run
-- ════════════════════════════════════════════════════════════
--
-- ⚠️ HONESTIDAD TÉCNICA: como no estamos usando el sistema de login
-- de Supabase (usamos Firebase Auth para eso), estas políticas NO
-- pueden verificar "¿esta persona inició sesión en Firebase?" — eso
-- es un sistema aparte que Supabase no conoce. Por eso el bucket
-- queda abierto a quien tenga tu "anon key" pública (la misma que
-- ya va escrita en tu código). Es el mismo tipo de trade-off que
-- aceptaste con el límite de 3 usuarios: no es 100% infranqueable
-- para alguien muy técnico, pero para 3 amigos usando el link es
-- más que suficiente. Lo que SÍ es innegociable (esto lo aplica
-- Supabase a nivel de servidor, no se puede saltar) es el límite
-- de tamaño y de tipo de archivo, configurado en el bucket mismo.

-- 1) Crea el bucket "canciones" — puedes hacerlo aquí por SQL o
--    desde Storage > New bucket en el dashboard (más fácil visualmente)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('canciones', 'canciones', true, 10485760, array['audio/*'])
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['audio/*'];

-- 2) Permitir que cualquiera con la anon key pueda SUBIR archivos
create policy "permitir subir canciones"
on storage.objects for insert
to anon
with check (bucket_id = 'canciones');

-- 3) Permitir que cualquiera pueda LEER/ESCUCHAR las canciones
create policy "permitir leer canciones"
on storage.objects for select
to anon
using (bucket_id = 'canciones');

-- 4) Permitir eliminar canciones (la app ya valida en su interfaz
--    que solo quien subió la canción o el admin vean el botón de
--    eliminar, pero a nivel de Supabase esto queda abierto)
create policy "permitir eliminar canciones"
on storage.objects for delete
to anon
using (bucket_id = 'canciones');
