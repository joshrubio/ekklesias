-- 0007: confirmación del tutor de un menor de 14 años por email (enlace de un solo uso).
-- Mientras el tutor no confirma, los permisos del menor no son efectivos (member_consents_effective)
-- y los líderes no lo ven. El historial de consentimientos sigue guardando lo que se dijo.

alter table guardians
  add column confirmed_at timestamptz,
  add column confirmed_via text check (confirmed_via in ('email', 'admin')),
  add column confirmed_by uuid references auth.users (id) on delete set null,
  add column rejected_at timestamptz;

alter table preference_tokens drop constraint preference_tokens_kind_check;
alter table preference_tokens add constraint preference_tokens_kind_check
  check (kind in ('preferences', 'unsubscribe', 'guardian'));

-- Permisos que se pueden usar de verdad: los de un menor sin tutor confirmado no cuentan.
create view member_consents_effective with (security_invoker = true) as
select c.*
from member_consents_current c
where not exists (
  select 1 from guardians g where g.member_id = c.member_id and g.confirmed_at is null
);

-- Un líder solo ve a quien aceptó la visibilidad y, si es menor, tiene tutor confirmado
create or replace function member_visible_to_leaders(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select c.granted from member_consents_current c
    where c.member_id = m and c.purpose = 'visibility'
  ), false)
  and not exists (select 1 from guardians g where g.member_id = m and g.confirmed_at is null)
$$;

-- Crea (o renueva) el enlace para el tutor. Lo llama la app al registrar al menor y el
-- administrador al reenviar. Invalida los enlaces anteriores sin usar.
create function create_guardian_token(p_member uuid, p_hours int default 336)
returns text
language plpgsql security definer set search_path = public as $$
declare
  t uuid;
  raw text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  select m.tenant_id into t
  from members m join guardians g on g.member_id = m.id
  where m.id = p_member and m.status = 'active' and g.confirmed_at is null;
  if t is null then raise exception 'sin_tutor_pendiente'; end if;
  if auth.uid() is not null and not is_tenant_admin(t) then raise exception 'sin permiso'; end if;
  if p_hours < 1 or p_hours > 24 * 60 then raise exception 'caducidad no válida'; end if;

  delete from preference_tokens
  where member_id = p_member and kind = 'guardian' and used_at is null;

  insert into preference_tokens (tenant_id, member_id, token_hash, expires_at, kind)
  values (t, p_member, token_hash(raw), now() + make_interval(hours => p_hours), 'guardian');

  insert into access_log (tenant_id, actor_user_id, action, entity, entity_id)
  values (t, auth.uid(), 'guardian_token', 'member', p_member);

  return raw;
end
$$;

-- Lo que ve el tutor al abrir el enlace. Devuelve el estado aunque ya se haya usado.
create function get_guardian_request(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'minor_first_name', m.first_name,
    'tenant_name', te.name,
    'tenant_slug', te.slug,
    'guardian_name', g.full_name,
    'relationship', g.relationship,
    'locale', m.locale,
    'status', case
      when g.confirmed_at is not null then 'confirmed'
      when g.rejected_at is not null then 'rejected'
      else 'pending' end
  )
  from preference_tokens pt
  join members m on m.id = pt.member_id and m.tenant_id = pt.tenant_id
  join guardians g on g.member_id = m.id
  join tenants te on te.id = m.tenant_id
  where pt.token_hash = token_hash(p_token)
    and pt.kind = 'guardian'
    and pt.expires_at > now()
    and m.status = 'active'
$$;

create function confirm_guardian(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare
  pt preference_tokens%rowtype;
begin
  select * into pt from preference_tokens
  where token_hash = token_hash(p_token) and kind = 'guardian'
    and expires_at > now() and used_at is null;
  if not found then raise exception 'invalid_token'; end if;

  update guardians
  set confirmed_at = now(), confirmed_via = 'email', rejected_at = null
  where member_id = pt.member_id and confirmed_at is null;

  update preference_tokens set used_at = now() where id = pt.id;
end
$$;

create function reject_guardian(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare
  pt preference_tokens%rowtype;
begin
  select * into pt from preference_tokens
  where token_hash = token_hash(p_token) and kind = 'guardian'
    and expires_at > now() and used_at is null;
  if not found then raise exception 'invalid_token'; end if;

  update guardians set rejected_at = now()
  where member_id = pt.member_id and confirmed_at is null;

  update preference_tokens set used_at = now() where id = pt.id;
end
$$;

-- Confirmación en persona por un administrador.
create function confirm_guardian_admin(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  select tenant_id into t from members where id = p_member and status = 'active';
  if t is null then raise exception 'miembro no encontrado'; end if;
  if not is_tenant_admin(t) then raise exception 'sin permiso'; end if;

  update guardians
  set confirmed_at = now(), confirmed_via = 'admin', confirmed_by = auth.uid(), rejected_at = null
  where member_id = p_member and confirmed_at is null;
  if not found then raise exception 'sin_tutor_pendiente'; end if;

  update preference_tokens set used_at = now()
  where member_id = p_member and kind = 'guardian' and used_at is null;

  insert into access_log (tenant_id, actor_user_id, action, entity, entity_id)
  values (t, auth.uid(), 'guardian_confirmed_admin', 'member', p_member);
end
$$;

revoke all on function
  get_guardian_request(text), confirm_guardian(text), reject_guardian(text)
from public, anon, authenticated;
grant execute on function
  get_guardian_request(text), confirm_guardian(text), reject_guardian(text)
to service_role;

revoke all on function create_guardian_token(uuid, int), confirm_guardian_admin(uuid)
from public, anon;
grant execute on function create_guardian_token(uuid, int), confirm_guardian_admin(uuid)
to authenticated, service_role;
