-- 0002: alta pública atómica de miembros + invitador en texto libre

alter table members add column invited_by_text text;

alter table members drop constraint members_inviter_exclusive;
alter table members add constraint members_inviter_exclusive check (
  not (discovered_alone and (invited_by is not null or invited_by_text is not null))
);

-- La supresión también borra el invitador escrito a mano (puede nombrar a terceros)
create or replace function erase_member(m uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  select tenant_id into t from members where id = m;
  if t is null then raise exception 'miembro no encontrado'; end if;
  if not is_tenant_admin(t) then raise exception 'sin permiso'; end if;

  insert into consent_events (tenant_id, member_id, purpose, granted, text_id, source)
  select c.tenant_id, c.member_id, c.purpose, false, c.text_id, 'rights_request'
  from member_consents_current c where c.member_id = m and c.granted;

  delete from guardians where member_id = m;
  delete from group_members where member_id = m;
  delete from preference_tokens where member_id = m;

  update members set
    first_name = null, last_name = null, email = null, phone = null,
    birth_date = null, address = null, baptized = null, invited_by_text = null,
    status = 'erased', erased_at = now()
  where id = m;

  insert into access_log (tenant_id, actor_user_id, action, entity, entity_id)
  values (t, auth.uid(), 'erase', 'member', m);
end
$$;

-- Registro público: valida y escribe miembro, tutor y consentimientos en una sola transacción.
-- Solo la clave de servicio puede ejecutarla (la app la llama desde el servidor).
create function register_member(
  p_tenant uuid,
  p_inviter_code text,
  p_invited_by_text text,
  p_discovered_alone boolean,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_birth_date date,
  p_address text,
  p_baptized boolean,
  p_locale text,
  p_source registration_source,
  p_guardian jsonb,
  p_consents jsonb,
  p_user_agent text,
  p_ip_hash text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_member uuid := gen_random_uuid();
  v_code text;
  v_inviter uuid;
  v_minor boolean;
  v_item jsonb;
  v_purpose consent_purpose;
  v_granted boolean;
  v_text_id uuid;
  v_required boolean;
  v_seen consent_purpose[] := '{}';
  v_source consent_source;
begin
  if p_source not in ('nfc', 'qr', 'link') then raise exception 'invalid_source'; end if;
  v_source := p_source::text::consent_source;

  if not exists (select 1 from tenants where id = p_tenant) then
    raise exception 'tenant_not_found';
  end if;
  if p_birth_date is null or p_birth_date > current_date or p_birth_date < date '1900-01-01' then
    raise exception 'invalid_birth_date';
  end if;

  v_minor := age(current_date, p_birth_date) < interval '14 years';
  if v_minor and (
    p_guardian is null
    or coalesce(trim(p_guardian ->> 'full_name'), '') = ''
    or coalesce(trim(p_guardian ->> 'email'), '') = ''
    or coalesce(trim(p_guardian ->> 'relationship'), '') = ''
  ) then
    raise exception 'guardian_required';
  end if;

  if p_inviter_code is not null then
    select id into v_inviter from members
    where invite_code = p_inviter_code and tenant_id = p_tenant and status = 'active';
    if v_inviter is null then raise exception 'invalid_invite'; end if;
  end if;

  insert into members (
    id, tenant_id, first_name, last_name, email, phone, birth_date, address, baptized,
    locale, invited_by, invited_by_text, discovered_alone, registered_via
  ) values (
    v_member, p_tenant, trim(p_first_name), trim(p_last_name), trim(p_email), trim(p_phone),
    p_birth_date, nullif(trim(p_address), ''), p_baptized, p_locale, v_inviter,
    left(nullif(trim(p_invited_by_text), ''), 120), p_discovered_alone, p_source
  ) returning invite_code into v_code;

  if v_minor then
    insert into guardians (tenant_id, member_id, full_name, email, relationship)
    values (
      p_tenant, v_member,
      trim(p_guardian ->> 'full_name'), trim(p_guardian ->> 'email'), trim(p_guardian ->> 'relationship')
    );
  end if;

  for v_item in select * from jsonb_array_elements(p_consents) loop
    v_purpose := (v_item ->> 'purpose')::consent_purpose;
    v_granted := (v_item ->> 'granted')::boolean;

    select id, is_required into v_text_id, v_required
    from consent_texts
    where tenant_id = p_tenant and purpose = v_purpose and locale = p_locale
    order by version desc limit 1;

    if v_text_id is null then
      select id, is_required into v_text_id, v_required
      from consent_texts
      where tenant_id = p_tenant and purpose = v_purpose and locale = 'es'
      order by version desc limit 1;
    end if;
    if v_text_id is null then raise exception 'consent_text_missing'; end if;
    if v_required and not v_granted then raise exception 'required_consent_missing'; end if;

    insert into consent_events (
      tenant_id, member_id, purpose, granted, text_id, source,
      given_by_guardian, user_agent, ip_hash
    ) values (
      p_tenant, v_member, v_purpose, v_granted, v_text_id, v_source,
      v_minor, left(p_user_agent, 300), p_ip_hash
    );
    v_seen := v_seen || v_purpose;
  end loop;

  if exists (
    select 1 from (
      select distinct on (purpose) purpose, is_required
      from consent_texts where tenant_id = p_tenant and locale = 'es'
      order by purpose, version desc
    ) latest
    where latest.is_required and not (latest.purpose = any (v_seen))
  ) then
    raise exception 'required_consent_missing';
  end if;

  return v_code;
end
$$;

-- Supabase concede ejecución por defecto a anon y authenticated: aquí se retira
revoke all on function register_member from public, anon, authenticated;
grant execute on function register_member to service_role;
