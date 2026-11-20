-- 0005: límite de intentos para los formularios públicos.
-- Contador por ventana fija dentro de Postgres: sin servicios externos y portable.
-- La clave la construye la app (acción + hash salado de la IP); aquí nunca se guarda una IP.

create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);

alter table rate_limits enable row level security;
-- sin políticas: solo accesible con la clave de servicio o desde las funciones

create function check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  w timestamptz;
  n int;
begin
  if p_key is null or length(p_key) not between 1 and 200
     or p_limit < 1 or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid_rate_limit';
  end if;

  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;

  -- limpieza ocasional de ventanas viejas
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '2 days';
  end if;

  return n <= p_limit;
end
$$;

revoke all on function check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function check_rate_limit(text, int, int) to service_role;
