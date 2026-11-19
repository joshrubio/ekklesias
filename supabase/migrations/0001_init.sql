-- Ekklesias: esquema inicial multi-tenant (borrador para revisión)
-- Todas las tablas de negocio llevan tenant_id y RLS activada.
-- Las altas públicas (registro) NO usan RLS anónima: pasan por el servidor con service role.

create extension if not exists pgcrypto;

create type app_role as enum ('admin', 'leader');
create type member_status as enum ('active', 'erased');
create type registration_source as enum ('nfc', 'qr', 'link', 'admin', 'import');
create type consent_purpose as enum (
  'membership', 'privacy_policy',
  'comms_email', 'comms_whatsapp', 'comms_sms', 'comms_push',
  'visibility', 'images'
);
create type consent_source as enum (
  'nfc', 'qr', 'link', 'preferences', 'unsubscribe', 'admin', 'rights_request'
);
create type channel as enum ('email', 'whatsapp', 'sms', 'push');
create type campaign_status as enum ('draft', 'scheduled', 'sending', 'sent');
create type recipient_status as enum ('queued', 'sent', 'failed', 'skipped_no_consent');
create type rights_type as enum ('access', 'rectification', 'erasure', 'portability', 'objection');
create type rights_status as enum ('received', 'in_progress', 'resolved', 'rejected');

-- Iglesias (tenants) y personal con login ---------------------------------

create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  contact_email text not null,
  logo_url text,
  brand_color text not null default '#1f2937',
  privacy_policy_url text,
  created_at timestamptz not null default now()
);

create table platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table tenant_users (
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid())
$$;

create function is_tenant_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from tenant_users where tenant_id = t and user_id = auth.uid())
$$;

create function is_tenant_admin(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tenant_users where tenant_id = t and user_id = auth.uid() and role = 'admin'
  )
$$;

-- Miembros -------------------------------------------------------------------

create table members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  birth_date date,
  address text,
  baptized boolean,
  locale text not null default 'es' check (locale in ('es', 'en', 'de', 'ar')),
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  invited_by uuid references members (id) on delete set null,
  discovered_alone boolean not null default false,
  registered_via registration_source not null,
  registered_at timestamptz not null default now(),
  status member_status not null default 'active',
  erased_at timestamptz,
  unique (id, tenant_id),
  constraint members_pii_present check (
    status = 'erased'
    or (
      first_name is not null and last_name is not null and email is not null
      and phone is not null and birth_date is not null
    )
  ),
  constraint members_inviter_exclusive check (not (discovered_alone and invited_by is not null))
);

create unique index members_tenant_email_uq
  on members (tenant_id, lower(email)) where status = 'active';
create index members_tenant_idx on members (tenant_id);
create index members_invited_by_idx on members (invited_by);

-- Tutor legal de menores de 14 años (art. 7 LOPDGDD)
create table guardians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  member_id uuid not null unique,
  full_name text not null,
  email text not null,
  relationship text not null,
  created_at timestamptz not null default now(),
  foreign key (member_id, tenant_id) references members (id, tenant_id) on delete cascade
);

-- Consentimientos: textos versionados y registro append-only -------------------

create table consent_texts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  purpose consent_purpose not null,
  version int not null,
  locale text not null check (locale in ('es', 'en', 'de', 'ar')),
  body text not null,
  is_required boolean not null default false,
  effective_from timestamptz not null default now(),
  unique (tenant_id, purpose, version, locale),
  unique (id, tenant_id, purpose)
);

create table consent_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  member_id uuid not null,
  purpose consent_purpose not null,
  granted boolean not null,
  text_id uuid not null,
  source consent_source not null,
  given_by_guardian boolean not null default false,
  user_agent text,
  ip_hash text,
  recorded_at timestamptz not null default now(),
  foreign key (member_id, tenant_id) references members (id, tenant_id),
  foreign key (text_id, tenant_id, purpose) references consent_texts (id, tenant_id, purpose)
);

create index consent_events_member_idx on consent_events (member_id, purpose, recorded_at desc);

create function consent_events_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'consent_events es solo de inserción';
  end if;
  if coalesce(current_setting('ekklesias.allow_purge', true), '') <> 'on' then
    raise exception 'consent_events no admite borrados';
  end if;
  return old;
end
$$;

create trigger consent_events_guard
  before update or delete on consent_events
  for each row execute function consent_events_guard();

create view member_consents_current with (security_invoker = true) as
select distinct on (member_id, purpose)
  member_id, tenant_id, purpose, granted, text_id, source, recorded_at
from consent_events
order by member_id, purpose, recorded_at desc, id;

-- Un líder solo ve a quien aceptó la visibilidad de sus datos
create function member_visible_to_leaders(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select c.granted from member_consents_current c
    where c.member_id = m and c.purpose = 'visibility'
  ), false)
$$;

-- Grupos y noticias (fase 2) ----------------------------------------------------

create table groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (id, tenant_id)
);

create table group_members (
  group_id uuid not null,
  member_id uuid not null,
  tenant_id uuid not null,
  primary key (group_id, member_id),
  foreign key (group_id, tenant_id) references groups (id, tenant_id) on delete cascade,
  foreign key (member_id, tenant_id) references members (id, tenant_id) on delete cascade
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  group_id uuid,
  channel channel not null,
  subject text,
  body text not null,
  status campaign_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (group_id, tenant_id) references groups (id, tenant_id)
);

create table campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  member_id uuid not null,
  tenant_id uuid not null,
  status recipient_status not null default 'queued',
  error text,
  sent_at timestamptz,
  unique (campaign_id, member_id),
  foreign key (campaign_id, tenant_id) references campaigns (id, tenant_id) on delete cascade,
  foreign key (member_id, tenant_id) references members (id, tenant_id) on delete cascade
);

-- Derechos RGPD, enlaces de preferencias y registro de accesos --------------------

create table rights_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  member_id uuid,
  requester_email text not null,
  type rights_type not null,
  status rights_status not null default 'received',
  received_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '1 month'),
  resolved_at timestamptz,
  notes text,
  foreign key (member_id, tenant_id) references members (id, tenant_id) on delete set null (member_id)
);

create table preference_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  member_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (member_id, tenant_id) references members (id, tenant_id) on delete cascade
);

create table access_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  at timestamptz not null default now()
);

-- Supresión: anonimiza al miembro y conserva la prueba de consentimiento anonimizada
create function erase_member(m uuid) returns void
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
    birth_date = null, address = null, baptized = null,
    status = 'erased', erased_at = now()
  where id = m;

  insert into access_log (tenant_id, actor_user_id, action, entity, entity_id)
  values (t, auth.uid(), 'erase', 'member', m);
end
$$;

-- RLS --------------------------------------------------------------------------

alter table tenants enable row level security;
alter table platform_admins enable row level security;
alter table tenant_users enable row level security;
alter table members enable row level security;
alter table guardians enable row level security;
alter table consent_texts enable row level security;
alter table consent_events enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table campaigns enable row level security;
alter table campaign_recipients enable row level security;
alter table rights_requests enable row level security;
alter table preference_tokens enable row level security;
alter table access_log enable row level security;

create policy tenants_select on tenants for select
  using (is_tenant_member(id) or is_platform_admin());
create policy tenants_update on tenants for update
  using (is_tenant_admin(id)) with check (is_tenant_admin(id));

create policy tenant_users_select on tenant_users for select
  using (is_tenant_member(tenant_id));
create policy tenant_users_admin on tenant_users for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

create policy members_select on members for select
  using (
    is_tenant_admin(tenant_id)
    or (is_tenant_member(tenant_id) and member_visible_to_leaders(id))
  );
create policy members_admin_write on members for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

create policy guardians_admin on guardians for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

create policy consent_texts_select on consent_texts for select
  using (is_tenant_member(tenant_id));
create policy consent_texts_insert on consent_texts for insert
  with check (is_tenant_admin(tenant_id));

create policy consent_events_select on consent_events for select
  using (is_tenant_admin(tenant_id));
create policy consent_events_insert on consent_events for insert
  with check (is_tenant_admin(tenant_id));

create policy groups_select on groups for select using (is_tenant_member(tenant_id));
create policy groups_admin on groups for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

create policy group_members_admin on group_members for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));
create policy campaigns_admin on campaigns for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));
create policy campaign_recipients_admin on campaign_recipients for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));
create policy rights_requests_admin on rights_requests for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

create policy access_log_select on access_log for select using (is_tenant_admin(tenant_id));
create policy access_log_insert on access_log for insert
  with check (is_tenant_member(tenant_id) and actor_user_id = auth.uid());

-- preference_tokens y platform_admins: sin políticas, solo accesibles con service role
