-- 0009: estilos por iglesia. El color principal ya existe (brand_color).
-- accent_color: resaltados y foco; si es nulo se usa el color principal.
-- font: tipografia de los titulares, de una lista cerrada (la misma que src/lib/theme.ts).

alter table tenants
  add column accent_color text
    check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$'),
  add column font text not null default 'fraunces'
    check (font in (
      'fraunces', 'playfair', 'lora', 'merriweather', 'dm-serif',
      'montserrat', 'poppins', 'space-grotesk', 'geist'
    ));

alter table tenants
  add constraint tenants_brand_color_hex
    check (brand_color ~ '^#[0-9a-fA-F]{6}$') not valid;
