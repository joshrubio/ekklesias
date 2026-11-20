-- Permisos explicitos sobre las tablas, sin depender de los privilegios por
-- defecto de Supabase. anon no recibe nada: las paginas publicas pasan por
-- funciones que se llaman con la clave de servicio. RLS sigue siendo la barrera
-- real para authenticated.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

grant usage, select on all sequences in schema public
  to authenticated, service_role;
