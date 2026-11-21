-- 0012: modo claro u oscuro por iglesia. Claro por defecto.

alter table tenants
  add column theme_mode text not null default 'light'
    check (theme_mode in ('light', 'dark'));
