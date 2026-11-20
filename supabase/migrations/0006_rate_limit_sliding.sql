-- 0006: límite de intentos más robusto.
-- 1) Ventana deslizante aproximada: la ventana anterior pesa en proporción al tiempo que
--    falta para que expire, así que no hay ráfaga doble en el borde de la ventana.
-- 2) Los intentos rechazados no suman: el bloqueo se levanta solo al deslizarse la ventana
--    y quien insiste no se queda bloqueado para siempre.
-- 3) Se bloquea la fila de la clave para que peticiones simultáneas no se salten el límite.
-- 4) p_now permite probar el comportamiento con fechas fijas (solo la clave de servicio ejecuta esto).

drop function check_rate_limit(text, int, int);

create function check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int,
  p_now timestamptz default now()
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  w_start timestamptz;
  cur int;
  prev int;
  frac numeric;
  estimate numeric;
begin
  if p_key is null or length(p_key) not between 1 and 200
     or p_limit < 1 or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid_rate_limit';
  end if;

  w_start := to_timestamp(floor(extract(epoch from p_now) / p_window_seconds) * p_window_seconds);
  frac := (extract(epoch from p_now) - extract(epoch from w_start)) / p_window_seconds;

  insert into rate_limits (key, window_start, hits) values (p_key, w_start, 0)
  on conflict (key, window_start) do nothing;

  select hits into cur from rate_limits
  where key = p_key and window_start = w_start
  for update;

  select coalesce(max(hits), 0) into prev from rate_limits
  where key = p_key and window_start = w_start - make_interval(secs => p_window_seconds);

  estimate := prev * (1 - frac) + cur;
  if estimate + 1 > p_limit then
    return false;
  end if;

  update rate_limits set hits = hits + 1 where key = p_key and window_start = w_start;

  if random() < 0.01 then
    delete from rate_limits where window_start < p_now - interval '2 days';
  end if;

  return true;
end
$$;

revoke all on function check_rate_limit(text, int, int, timestamptz) from public, anon, authenticated;
grant execute on function check_rate_limit(text, int, int, timestamptz) to service_role;
