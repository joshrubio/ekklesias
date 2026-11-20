-- 0003: enlaces de preferencias y baja, y solicitudes de derechos públicas.
-- Las funciones públicas solo las ejecuta la clave de servicio (la app, desde el servidor).
-- El token en claro nunca se guarda: solo su SHA-256.

alter table preference_tokens
  add column kind text not null default 'preferences'
  check (kind in ('preferences', 'unsubscribe'));

create function token_hash(p_token text) returns text
language sql immutable as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
$$;

-- Un administrador genera el enlace para un miembro (se copia o se envía por email).
create function create_preference_token(
  p_member uuid,
  p_kind text default 'preferences',
  p_hours int default 168
) returns text
language plpgsql security definer set search_path = public as $$
declare
  t uuid;
  raw text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  select tenant_id into t from members where id = p_member and status = 'active';
  if t is null then raise exception 'miembro no encontrado'; end if;
  if auth.uid() is not null and not is_tenant_admin(t) then
    raise exception 'sin permiso';
  end if;
  if p_hours < 1 or p_hours > 24 * 90 then raise exception 'caducidad no válida'; end if;

  insert into preference_tokens (tenant_id, member_id, token_hash, expires_at, kind)
  values (t, p_member, token_hash(raw), now() + make_interval(hours => p_hours), p_kind);

  insert into access_log (tenant_id, actor_user_id, action, entity, entity_id)
  values (t, auth.uid(), 'create_token', 'member', p_member);

  return raw;
end
$$;

-- Estado actual de los permisos que enseña la página de preferencias.
create function get_preferences(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'first_name', m.first_name,
    'tenant_slug', te.slug,
    'tenant_name', te.name,
    'locale', m.locale,
    'consents', coalesce((
      select jsonb_object_agg(c.purpose, c.granted)
      from member_consents_current c where c.member_id = m.id
    ), '{}'::jsonb)
  )
  from preference_tokens pt
  join members m on m.id = pt.member_id and m.tenant_id = pt.tenant_id
  join tenants te on te.id = m.tenant_id
  where pt.token_hash = token_hash(p_token)
    and pt.kind = 'preferences'
    and pt.expires_at > now()
    and m.status = 'active'
$$;

-- Texto vigente de una finalidad en el idioma del miembro (con es como respaldo).
create function latest_consent_text(p_tenant uuid, p_purpose consent_purpose, p_locale text)
returns uuid
language sql stable security definer set search_path = public as $$
  select id from consent_texts
  where tenant_id = p_tenant and purpose = p_purpose and locale in (p_locale, 'es')
  order by (locale = p_locale) desc, version desc
  limit 1
$$;

-- El miembro cambia sus permisos opcionales. Solo se registran los cambios reales.
create function apply_preferences(
  p_token text,
  p_consents jsonb,
  p_user_agent text,
  p_ip_hash text
) returns int
language plpgsql security definer set search_path = public as $$
declare
  pt preference_tokens%rowtype;
  m members%rowtype;
  item jsonb;
  purp consent_purpose;
  want boolean;
  have boolean;
  txt uuid;
  changed int := 0;
  by_guardian boolean;
begin
  select * into pt from preference_tokens
  where token_hash = token_hash(p_token) and kind = 'preferences' and expires_at > now();
  if not found then raise exception 'invalid_token'; end if;

  select * into m from members where id = pt.member_id and status = 'active';
  if not found then raise exception 'invalid_token'; end if;

  by_guardian := exists (select 1 from guardians g where g.member_id = m.id);

  for item in select * from jsonb_array_elements(coalesce(p_consents, '[]'::jsonb)) loop
    begin
      purp := (item ->> 'purpose')::consent_purpose;
    exception when invalid_text_representation then
      raise exception 'invalid_purpose';
    end;
    if purp in ('membership', 'privacy_policy') then
      raise exception 'invalid_purpose';
    end if;
    want := (item ->> 'granted')::boolean;

    select granted into have from member_consents_current
    where member_id = m.id and purpose = purp;

    if coalesce(have, false) is distinct from want then
      txt := latest_consent_text(m.tenant_id, purp, m.locale);
      if txt is null then raise exception 'consent_text_missing'; end if;
      insert into consent_events (
        tenant_id, member_id, purpose, granted, text_id, source,
        given_by_guardian, user_agent, ip_hash
      ) values (
        m.tenant_id, m.id, purp, want, txt, 'preferences',
        by_guardian, left(p_user_agent, 300), p_ip_hash
      );
      changed := changed + 1;
    end if;
  end loop;

  return changed;
end
$$;

-- Baja de un clic: retira todas las comunicaciones. Idempotente.
create function unsubscribe_member(
  p_token text,
  p_user_agent text,
  p_ip_hash text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pt preference_tokens%rowtype;
  m members%rowtype;
  c record;
begin
  select * into pt from preference_tokens
  where token_hash = token_hash(p_token) and kind = 'unsubscribe' and expires_at > now();
  if not found then raise exception 'invalid_token'; end if;

  select * into m from members where id = pt.member_id and status = 'active';
  if not found then raise exception 'invalid_token'; end if;

  for c in
    select purpose, text_id from member_consents_current
    where member_id = m.id and granted
      and purpose in ('comms_email', 'comms_whatsapp', 'comms_sms', 'comms_push')
  loop
    insert into consent_events (
      tenant_id, member_id, purpose, granted, text_id, source, user_agent, ip_hash
    ) values (
      m.tenant_id, m.id, c.purpose, false, c.text_id, 'unsubscribe',
      left(p_user_agent, 300), p_ip_hash
    );
  end loop;

  update preference_tokens set used_at = coalesce(used_at, now()) where id = pt.id;
  return jsonb_build_object('tenant_slug', (select slug from tenants where id = m.tenant_id));
end
$$;

-- Solicitud de derechos desde la página pública. Si el email no es de ningún miembro
-- también se guarda (el responsable decide), y la página responde igual en ambos casos.
create function create_rights_request(
  p_tenant uuid,
  p_email text,
  p_type rights_type,
  p_notes text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  mid uuid;
  rid uuid;
begin
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  select id into mid from members
  where tenant_id = p_tenant and lower(email) = lower(p_email) and status = 'active';

  insert into rights_requests (tenant_id, member_id, requester_email, type, notes)
  values (p_tenant, mid, lower(p_email), p_type, left(p_notes, 2000))
  returning id into rid;
  return rid;
end
$$;

revoke all on function
  token_hash(text),
  get_preferences(text),
  latest_consent_text(uuid, consent_purpose, text),
  apply_preferences(text, jsonb, text, text),
  unsubscribe_member(text, text, text),
  create_rights_request(uuid, text, rights_type, text)
from public, anon, authenticated;
grant execute on function
  token_hash(text),
  get_preferences(text),
  latest_consent_text(uuid, consent_purpose, text),
  apply_preferences(text, jsonb, text, text),
  unsubscribe_member(text, text, text),
  create_rights_request(uuid, text, rights_type, text)
to service_role;

revoke all on function create_preference_token(uuid, text, int) from public, anon;
grant execute on function create_preference_token(uuid, text, int) to authenticated, service_role;
