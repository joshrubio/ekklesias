-- 0011: Storage necesita poder ver el objeto para borrarlo. Sin una politica de lectura,
-- "remove" no encuentra nada y los logos reemplazados quedan huerfanos en el bucket.
-- La lectura publica por URL no cambia; esto solo afecta a la API autenticada.

create policy tenant_logos_select on storage.objects for select to authenticated
  using (bucket_id = 'tenant-logos' and tenant_logo_folder_is_admin(name));
