// Datos ficticios para demostraciones en LOCAL. Uso: pnpm seed:demo
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key || !/127\.0\.0\.1|localhost/.test(url)) {
  console.error("Solo se ejecuta contra Supabase local (revisa .env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const PASSWORD = "demo-ekklesias-2026";
const users = [
  { email: "admin@lifepoint.example", role: "admin" },
  { email: "lider@lifepoint.example", role: "leader" },
];

const { data: tenant } = await db.from("tenants").select("id").eq("slug", "lifepoint").single();
if (!tenant) throw new Error("Falta el tenant lifepoint: aplica supabase/seed.sql");

for (const u of users) {
  let id;
  const created = await db.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (created.error) {
    const list = await db.auth.admin.listUsers({ perPage: 200 });
    id = list.data.users.find((x) => x.email === u.email)?.id;
  } else {
    id = created.data.user.id;
  }
  if (!id) throw new Error(`No se pudo crear ${u.email}`);
  await db.from("tenant_users").upsert({ tenant_id: tenant.id, user_id: id, role: u.role });
}

const all = (granted) =>
  ["membership", "privacy_policy", "comms_email", "comms_whatsapp", "comms_sms", "visibility", "images"].map(
    (purpose) => ({
      purpose,
      granted: ["membership", "privacy_policy"].includes(purpose) || granted.includes(purpose),
    }),
  );

const demo = [
  ["Lucía", "Fernández", "lucia@demo.example", "+34611000001", "1990-04-12", true, ["comms_email", "visibility"]],
  ["Marcos", "Ortega", "marcos@demo.example", "+34611000002", "1985-09-03", false, ["comms_email", "comms_whatsapp"]],
  ["Sara", "Núñez", "sara@demo.example", "+34611000003", "2006-01-20", null, ["visibility", "images"]],
  ["Daniel", "Prieto", "daniel@demo.example", "+34611000004", "1978-11-30", true, []],
  ["Elena", "Vidal", "elena@demo.example", "+34611000005", "1995-06-18", false, ["comms_email", "comms_sms", "visibility"]],
];

let n = 0;
const codes = {};

async function register([first, last, email, phone, birth, baptized, granted], inviterCode = null, guardian = null) {
  const { data, error } = await db.rpc("register_member", {
    p_tenant: tenant.id,
    p_inviter_code: inviterCode,
    p_invited_by_text: null,
    p_discovered_alone: !inviterCode,
    p_first_name: first,
    p_last_name: last,
    p_email: email,
    p_phone: phone,
    p_birth_date: birth,
    p_address: null,
    p_baptized: baptized,
    p_locale: "es",
    p_source: inviterCode ? "nfc" : n % 2 ? "qr" : "nfc",
    p_guardian: guardian,
    p_consents: all(granted),
    p_user_agent: "seed-demo",
    p_ip_hash: "seed",
  });
  if (error && error.code !== "23505") throw error;
  n++;
  if (error) {
    const { data: row } = await db.from("members").select("invite_code").eq("tenant_id", tenant.id).ilike("email", email).eq("status", "active").maybeSingle();
    return row?.invite_code;
  }
  return data;
}

for (const m of demo) codes[m[0]] = await register(m);

if (codes["Lucía"]) {
  await register(["Pablo", "Gil", "pablo@demo.example", "+34611000006", "1999-02-14", false, ["comms_email"]], codes["Lucía"]);
  await register(
    ["Nora", "Gil", "nora@demo.example", "+34611000007", new Date(Date.now() - 9 * 365.25 * 864e5).toISOString().slice(0, 10), null, []],
    codes["Lucía"],
    { full_name: "Marta Gil", email: "marta@demo.example", relationship: "madre" },
  );
}

console.log("Listo. Panel: /login · admin@lifepoint.example o lider@lifepoint.example · contraseña:", PASSWORD);
