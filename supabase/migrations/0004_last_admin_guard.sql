-- 0004: una iglesia nunca se queda sin administrador.
-- Se comprueba en la base (no solo en la app) para que ninguna ruta de código lo salte.

create function tenant_users_last_admin_guard() returns trigger
language plpgsql as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     -- si la iglesia se está borrando, la cascada puede quitar a todos
     and exists (select 1 from tenants where id = old.tenant_id)
     and not exists (
       select 1 from tenant_users
       where tenant_id = old.tenant_id and role = 'admin' and user_id <> old.user_id
     )
  then
    raise exception 'last_admin: la iglesia necesita al menos un administrador';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create trigger tenant_users_last_admin
  before update of role or delete on tenant_users
  for each row execute function tenant_users_last_admin_guard();

-- Un líder solo ve su propia fila; el listado completo de usuarios es cosa de administradores.
drop policy tenant_users_select on tenant_users;
create policy tenant_users_select on tenant_users for select
  using (is_tenant_admin(tenant_id) or user_id = auth.uid());
