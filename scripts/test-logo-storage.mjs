// Comprueba en LOCAL las reglas del bucket tenant-logos con una sesion real de administrador.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !anon || !/127\.0\.0\.1|localhost/.test(url)) {
  console.error("Solo se ejecuta contra Supabase local (revisa .env.local).");
  process.exit(1);
}

const db = createClient(url, anon, { auth: { persistSession: false } });
const login = await db.auth.signInWithPassword({
  email: "admin@lifepoint.example",
  password: "demo-ekklesias-2026",
});
if (login.error) throw login.error;

const { data: mine } = await db.from("tenants").select("id").eq("slug", "lifepoint").single();
// Un admin no puede leer otras iglesias (RLS), asi que el id ajeno se pasa por entorno.
const other = process.env.OTHER_TENANT_ID ? { id: process.env.OTHER_TENANT_ID } : null;
if (!other) {
  console.error("Falta OTHER_TENANT_ID (id de otra iglesia local).");
  process.exit(1);
}

const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const uuid = () => crypto.randomUUID();
let fails = 0;
const check = (label, ok) => {
  console.log(ok ? "OK  " : "FAIL", label);
  if (!ok) fails++;
};
const bucket = db.storage.from("tenant-logos");

const own = `${mine.id}/${uuid()}.png`;
let r = await bucket.upload(own, png, { contentType: "image/png" });
check("el admin sube un PNG a la carpeta de su iglesia", !r.error);

r = await bucket.upload(`${other.id}/${uuid()}.png`, png, { contentType: "image/png" });
check("no puede subir a la carpeta de otra iglesia", !!r.error);

r = await bucket.upload(`${mine.id}/${uuid()}.svg`, new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"), {
  contentType: "image/svg+xml",
});
check("el SVG se rechaza por tipo", !!r.error);

r = await bucket.upload(`${mine.id}/${uuid()}.png`, new Uint8Array(600 * 1024), { contentType: "image/png" });
check("un fichero de 600 KB se rechaza por tamaño", !!r.error);

r = await bucket.upload(`not-a-uuid/${uuid()}.png`, png, { contentType: "image/png" });
check("una carpeta que no es un id de iglesia se rechaza", !!r.error);

const anonDb = createClient(url, anon, { auth: { persistSession: false } });
r = await anonDb.storage.from("tenant-logos").upload(`${mine.id}/${uuid()}.png`, png, { contentType: "image/png" });
check("sin sesión no se puede subir", !!r.error);

const { error: dbError } = await db.from("tenants").update({ logo_path: `${other.id}/${uuid()}.png` }).eq("id", mine.id);
check("logo_path de otra carpeta se rechaza en la tabla", !!dbError);
const { error: dbSvg } = await db.from("tenants").update({ logo_path: `${mine.id}/${uuid()}.svg` }).eq("id", mine.id);
check("logo_path con extensión svg se rechaza en la tabla", !!dbSvg);

const res = await fetch(`${url}/storage/v1/object/public/tenant-logos/${own}`);
check("el logo se lee por URL pública", res.ok && res.headers.get("content-type") === "image/png");

await bucket.remove([own]);
console.log(fails === 0 ? "\nTODO OK" : `\n${fails} FALLOS`);
process.exit(fails === 0 ? 0 : 1);
