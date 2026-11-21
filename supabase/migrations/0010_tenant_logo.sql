-- 0010: logo de la iglesia. Solo PNG, JPG y WebP (nada de SVG, que puede llevar scripts)
-- y como maximo 512 KB. Cada iglesia escribe unicamente dentro de su carpeta <tenant_id>/.

alter table tenants
  add column logo_path text,
  add constraint tenants_logo_path_format check (
    logo_path is null or (
      logo_path like id::text || '/%'
      and logo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-logos', 'tenant-logos', true, 524288,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- La lectura es publica por URL (el logo se ve en el formulario de registro).
-- Escribir, reemplazar o borrar solo lo hace un administrador de esa iglesia.

create function tenant_logo_folder_is_admin(object_name text) returns boolean
language sql stable as $$
  select case
    when (storage.foldername(object_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then is_tenant_admin(((storage.foldername(object_name))[1])::uuid)
    else false
  end
$$;

create policy tenant_logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'tenant-logos' and tenant_logo_folder_is_admin(name));

create policy tenant_logos_update on storage.objects for update to authenticated
  using (bucket_id = 'tenant-logos' and tenant_logo_folder_is_admin(name))
  with check (bucket_id = 'tenant-logos' and tenant_logo_folder_is_admin(name));

create policy tenant_logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tenant-logos' and tenant_logo_folder_is_admin(name));
