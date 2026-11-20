import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const migration = ['0001_init.sql', '0002_register_member.sql', '0003_preferences_rights.sql', '0004_last_admin_guard.sql', '0005_rate_limit.sql', '0006_rate_limit_sliding.sql']
  .map(f => readFileSync(fileURLToPath(new URL('../migrations/' + f, import.meta.url)), 'utf8')).join('\n')
const db = new PGlite({ extensions: { pgcrypto } })

const A = '00000000-0000-0000-0000-0000000000a1'
const B = '00000000-0000-0000-0000-0000000000b1'
const C = '00000000-0000-0000-0000-0000000000c1'
const T1 = '11111111-1111-1111-1111-111111111111'
const T2 = '22222222-2222-2222-2222-222222222222'
const M1 = 'bbbbbbbb-0000-0000-0000-000000000001'
const M2 = 'bbbbbbbb-0000-0000-0000-000000000002'
const X1 = 'aaaaaaaa-0000-0000-0000-000000000001'
const X2 = 'aaaaaaaa-0000-0000-0000-000000000002'
const X3 = 'aaaaaaaa-0000-0000-0000-000000000003'

let fails = 0
const show = (label, rows) => console.log(label, JSON.stringify(rows))
const check = (label, cond) => { console.log(cond ? 'OK  ' : 'FAIL', label); if (!cond) fails++ }
const rejects = async (label, sql) => {
  try { await db.exec(sql); check(label, false) } catch (e) { check(label + ' -> ' + e.message.slice(0, 70), true) }
}

await db.exec(`
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role authenticated nologin;
create role anon nologin;
create role service_role nologin;
alter default privileges in schema public grant execute on functions to authenticated, anon, service_role;`)
await db.exec(migration)
await db.exec(`
grant usage on schema public, auth to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function auth.uid() to authenticated, service_role;
insert into auth.users values ('${A}'), ('${B}'), ('${C}');
insert into tenants (id, slug, name, contact_email) values
 ('${T1}','lifepoint','Lifepoint','a@lp.es'), ('${T2}','otra','Otra','b@otra.es');
insert into tenant_users values ('${T1}','${A}','admin'), ('${T1}','${B}','leader'), ('${T2}','${C}','admin');
insert into consent_texts (id, tenant_id, purpose, version, locale, body, is_required) values
 ('${X1}','${T1}','membership',1,'es','t',true), ('${X2}','${T1}','visibility',1,'es','t',false), ('${X3}','${T1}','comms_email',1,'es','t',false);
insert into consent_texts (tenant_id, purpose, version, locale, body, is_required) values
 ('${T1}','membership',1,'ar','t',true);
insert into members (id, tenant_id, first_name, last_name, email, phone, birth_date, registered_via, discovered_alone, locale) values
 ('${M1}','${T1}','Ana','Lopez','ana@x.es','+34600000001','1990-01-01','nfc', true, 'es'),
 ('${M2}','${T1}','Luis','Perez','luis@x.es','+34600000002','1985-05-05','link', true, 'ar');
insert into consent_events (tenant_id, member_id, purpose, granted, text_id, source, recorded_at) values
 ('${T1}','${M1}','membership',true,'${X1}','nfc', now() - interval '3 min'),
 ('${T1}','${M1}','visibility',true,'${X2}','nfc', now() - interval '3 min'),
 ('${T1}','${M1}','comms_email',true,'${X3}','nfc', now() - interval '3 min'),
 ('${T1}','${M1}','comms_email',false,'${X3}','preferences', now() - interval '1 min'),
 ('${T1}','${M2}','membership',true,'${X1}','link', now());`)

const cur = await db.query(`select m.first_name, c.purpose, c.granted from member_consents_current c join members m on m.id=c.member_id order by 1,2`)
show('estado actual:', cur.rows)
check('revocacion posterior gana (Ana comms_email=false)', cur.rows.some(r => r.first_name === 'Ana' && r.purpose === 'comms_email' && r.granted === false))

await rejects('consent_events rechaza UPDATE', `update consent_events set granted = true`)
await rejects('consent_events rechaza DELETE', `delete from consent_events`)
await rejects('FK impide cruzar tenants en consentimientos',
  `insert into consent_events (tenant_id, member_id, purpose, granted, text_id, source) values ('${T2}','${M1}','membership',true,'${X1}','link')`)
await rejects('telefono obligatorio para miembros activos',
  `insert into members (tenant_id, first_name, last_name, email, birth_date, registered_via) values ('${T1}','Sin','Tel','s@x.es','1990-01-01','link')`)
await rejects('idioma no soportado se rechaza',
  `update members set locale='fr' where id='${M1}'`)
await rejects('no se puede invitar y a la vez "descubri por mi cuenta"',
  `update members set invited_by='${M2}' where id='${M1}'`)

await db.exec(`set role authenticated; set request.jwt.claim.sub='${B}'`)
let r = await db.query(`select first_name from members order by 1`)
show('lider ve:', r.rows)
check('lider solo ve a Ana (aceptó visibilidad) ', r.rows.length === 1 && r.rows[0].first_name === 'Ana')
r = await db.query(`select count(*)::int n from consent_events`)
check('lider no ve consent_events', r.rows[0].n === 0)

await db.exec(`set request.jwt.claim.sub='${A}'`)
r = await db.query(`select first_name from members order by 1`)
check('admin Lifepoint ve 2 miembros', r.rows.length === 2)

await db.exec(`set request.jwt.claim.sub='${C}'`)
r = await db.query(`select count(*)::int n from members`)
check('admin de otra iglesia ve 0 miembros', r.rows[0].n === 0)
await rejects('admin de otra iglesia no puede borrar (erase_member)', `select erase_member('${M1}')`)

await db.exec(`set request.jwt.claim.sub='${A}'`)
await db.exec(`select erase_member('${M1}')`)
await db.exec(`reset role`)
r = await db.query(`select first_name, email, status from members where id='${M1}'`)
show('tras supresión:', r.rows)
check('miembro anonimizado', r.rows[0].first_name === null && r.rows[0].email === null && r.rows[0].status === 'erased')
r = await db.query(`select purpose, granted, source from consent_events where member_id='${M1}' order by recorded_at, purpose`)
check('prueba de consentimiento conservada con revocaciones', r.rows.length >= 6)
r = await db.query(`select action, entity from access_log`)
check('supresión registrada en access_log', r.rows.length === 1 && r.rows[0].action === 'erase')

// ---- register_member (0002) ----
const q = v => v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`
let emailSeq = 0
const reg = (o = {}) => {
  const d = { tenant: T1, inviter: null, invText: null, alone: true, first: 'Eva', last: 'Ruiz',
    email: `eva${++emailSeq}@x.es`, phone: '+34600111222', birth: '1992-02-02', address: null, baptized: null,
    locale: 'es', source: 'link', guardian: null,
    consents: [{ purpose: 'membership', granted: true }, { purpose: 'comms_email', granted: false }], ...o }
  return `select register_member(${q(d.tenant)}::uuid, ${q(d.inviter)}, ${q(d.invText)}, ${d.alone}, ${q(d.first)}, ${q(d.last)}, ${q(d.email)}, ${q(d.phone)}, ${q(d.birth)}::date, ${q(d.address)}, ${d.baptized === null ? 'null' : d.baptized}, ${q(d.locale)}, ${q(d.source)}::registration_source, ${d.guardian ? q(JSON.stringify(d.guardian)) + '::jsonb' : 'null::jsonb'}, ${q(JSON.stringify(d.consents))}::jsonb, 'UA', 'hash') as code`
}
const regCode = async o => (await db.query(reg(o))).rows[0].code
const kid = new Date(Date.now() - 10 * 365.25 * 864e5).toISOString().slice(0, 10)

const code1 = await regCode()
check('alta de adulto devuelve invite_code', /^[0-9a-f]{12}$/.test(code1))
r = await db.query(`select count(*)::int n from consent_events e join members m on m.id=e.member_id where m.invite_code='${code1}'`)
check('un evento por casilla mostrada (2, incluida la rechazada)', r.rows[0].n === 2)

await rejects('sin consentimiento obligatorio', reg({ email: 'fail@x.es', consents: [{ purpose: 'comms_email', granted: true }] }))
await rejects('consentimiento obligatorio rechazado', reg({ email: 'fail@x.es', consents: [{ purpose: 'membership', granted: false }] }))
await rejects('fecha de nacimiento futura', reg({ email: 'fail@x.es', birth: '2999-01-01' }))
await rejects('menor de 14 sin tutor', reg({ email: 'fail@x.es', birth: kid }))
r = await db.query(`select count(*)::int n from members where email = 'fail@x.es'`)
check('los fallos no dejan datos a medias (atomicidad)', r.rows[0].n === 0)

const kidCode = await regCode({ email: 'kid@x.es', birth: kid, guardian: { full_name: 'Madre', email: 'm@x.es', relationship: 'madre' } })
r = await db.query(`select (select count(*)::int from guardians g join members m on m.id=g.member_id where m.invite_code='${kidCode}') g,
  (select bool_and(given_by_guardian) from consent_events e join members m on m.id=e.member_id where m.invite_code='${kidCode}') flag`)
check('menor: tutor guardado y eventos marcados como dados por tutor', r.rows[0].g === 1 && r.rows[0].flag === true)

const inv = (await db.query(`select invite_code from members where id='${M2}'`)).rows[0].invite_code
const invitedCode = await regCode({ inviter: inv, alone: false, email: 'inv@x.es' })
r = await db.query(`select invited_by from members where invite_code='${invitedCode}'`)
check('invitador enlazado por código', r.rows[0].invited_by === M2)
await rejects('código de invitador inválido', reg({ email: 'bad@x.es', inviter: 'zzzzzzzzzzzz', alone: false }))
await rejects('invitador y "descubrí por mi cuenta" a la vez', reg({ email: 'bad@x.es', inviter: inv, alone: true }))
await rejects('email duplicado en la misma iglesia', reg({ email: 'inv@x.es' }))
const txtCode = await regCode({ email: 'txt@x.es', alone: false, invText: 'María, de la iglesia' })
r = await db.query(`select invited_by_text from members where invite_code='${txtCode}'`)
check('invitador en texto libre guardado', r.rows[0].invited_by_text === 'María, de la iglesia')

const arCode = await regCode({ email: 'ar@x.es', locale: 'ar', consents: [{ purpose: 'membership', granted: true }, { purpose: 'visibility', granted: false }] })
r = await db.query(`select e.purpose, t.locale from consent_events e join consent_texts t on t.id=e.text_id join members m on m.id=e.member_id where m.invite_code='${arCode}' order by 1`)
check('texto en idioma del miembro, con respaldo en es', JSON.stringify(r.rows) === JSON.stringify([{ purpose: 'membership', locale: 'ar' }, { purpose: 'visibility', locale: 'es' }]))

await db.exec(`set role authenticated`)
await rejects('authenticated no puede ejecutar register_member', reg({ email: 'p@x.es' }))
await db.exec(`reset role`)
await db.exec(`set role anon`)
await rejects('anon no puede ejecutar register_member', reg({ email: 'p2@x.es' }))
await db.exec(`reset role; set role service_role`)
check('service_role sí puede', /^[0-9a-f]{12}$/.test(await regCode({ email: 'svc@x.es' })))
await db.exec(`reset role`)

// --- Preferencias, baja y derechos (0003) ---
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`)
const pmCode = await regCode({ email: 'pref@x.es' })
const PM = (await db.query(`select id from members where invite_code='${pmCode}'`)).rows[0].id
const tok = async (m, kind = 'preferences', hours = 168) =>
  (await db.query(`select create_preference_token('${m}', '${kind}', ${hours}) t`)).rows[0].t
const cur2 = async (m, p) =>
  (await db.query(`select granted from member_consents_current where member_id='${m}' and purpose='${p}'`)).rows[0]?.granted

const pref = await tok(PM)
r = await db.query(`select count(*)::int n from preference_tokens where token_hash = '${pref}'`)
check('el token en claro no se guarda (solo su hash)', r.rows[0].n === 0 && pref.length >= 64)
r = await db.query(`select get_preferences('${pref}') p`)
check('get_preferences devuelve nombre y estado actual', r.rows[0].p.first_name === 'Eva' && r.rows[0].p.consents.comms_email === false)
r = await db.query(`select get_preferences('token-falso') p`)
check('get_preferences con token falso -> null', r.rows[0].p === null)

const apply = (t, list) => `select apply_preferences('${t}', '${JSON.stringify(list)}'::jsonb, 'UA', 'h') n`
r = await db.query(apply(pref, [{ purpose: 'comms_email', granted: true }, { purpose: 'visibility', granted: true }]))
check('apply_preferences registra solo los cambios reales (2)', r.rows[0].n === 2)
check('estado actual refleja los cambios', (await cur2(PM, 'comms_email')) === true && (await cur2(PM, 'visibility')) === true)
r = await db.query(apply(pref, [{ purpose: 'comms_email', granted: true }, { purpose: 'visibility', granted: true }]))
check('repetir lo mismo no crea eventos nuevos', r.rows[0].n === 0)
r = await db.query(`select count(*)::int n from consent_events where member_id='${PM}' and purpose='comms_email'`)
check('el cambio se añade al historial con origen preferences (2 eventos en total)', r.rows[0].n === 2)
await rejects('no se puede tocar membership desde preferencias', apply(pref, [{ purpose: 'membership', granted: false }]))
await rejects('finalidad desconocida', apply(pref, [{ purpose: 'nada', granted: true }]))
await rejects('token falso en apply_preferences', apply('x', []))

const old = await tok(PM, 'preferences', 1)
await db.exec(`update preference_tokens set expires_at = now() - interval '1 minute' where token_hash = token_hash('${old}')`)
r = await db.query(`select get_preferences('${old}') p`)
check('token caducado -> null', r.rows[0].p === null)
await rejects('token caducado en apply_preferences', apply(old, []))

const unsub = await tok(PM, 'unsubscribe')
r = await db.query(`select get_preferences('${unsub}') p`)
check('un token de baja no abre las preferencias', r.rows[0].p === null)
await rejects('un token de preferencias no sirve para la baja', `select unsubscribe_member('${pref}', 'UA', 'h')`)
await db.query(`select unsubscribe_member('${unsub}', 'UA', 'h')`)
check('la baja retira las comunicaciones', (await cur2(PM, 'comms_email')) === false)
check('la baja no toca visibilidad ni membresía', (await cur2(PM, 'membership')) === true && (await cur2(PM, 'visibility')) === true)
await db.query(`select unsubscribe_member('${unsub}', 'UA', 'h')`)
check('la baja es idempotente (segundo clic sin error)', true)

r = await db.query(`select create_rights_request('${T1}', 'PREF@x.es', 'access', 'quiero mis datos') id`)
r = await db.query(`select member_id, requester_email, status, due_at > now() + interval '27 days' as plazo from rights_requests where id='${r.rows[0].id}'`)
check('solicitud de miembro conocido: vinculada, en minúsculas, plazo de un mes', r.rows[0].member_id === PM && r.rows[0].requester_email === 'pref@x.es' && r.rows[0].status === 'received' && r.rows[0].plazo)
r = await db.query(`select create_rights_request('${T1}', 'desconocido@x.es', 'erasure', null) id`)
r = await db.query(`select member_id from rights_requests where id='${r.rows[0].id}'`)
check('solicitud de email desconocido: se guarda sin miembro', r.rows[0].member_id === null)
await rejects('email no válido en la solicitud', `select create_rights_request('${T1}', 'no-es-email', 'access', null)`)

await db.exec(`set role authenticated`)
await rejects('authenticated no ejecuta apply_preferences', apply(pref, []))
await rejects('authenticated no ejecuta create_rights_request', `select create_rights_request('${T1}', 'a@x.es', 'access', null)`)
await db.exec(`set request.jwt.claim.sub='${B}'`)
await rejects('un líder no genera enlaces de preferencias', `select create_preference_token('${PM}')`)
await db.exec(`set request.jwt.claim.sub='${C}'`)
await rejects('un admin de otra iglesia no genera enlaces', `select create_preference_token('${PM}')`)
await db.exec(`set request.jwt.claim.sub='${A}'`)
check('el admin de la iglesia sí genera enlaces', (await tok(PM)).length >= 64)
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`)

// --- Último administrador (0004) ---
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`)
await rejects('no se puede degradar al único admin', `update tenant_users set role='leader' where tenant_id='${T1}' and user_id='${A}'`)
await rejects('no se puede borrar al único admin', `delete from tenant_users where tenant_id='${T1}' and user_id='${A}'`)
await db.exec(`insert into auth.users values ('dddddddd-0000-0000-0000-000000000001'); insert into tenant_users values ('${T1}','dddddddd-0000-0000-0000-000000000001','admin')`)
await db.exec(`update tenant_users set role='leader' where tenant_id='${T1}' and user_id='${A}'`)
check('con otro admin sí se puede degradar a uno', true)
await rejects('ahora el otro es el único admin', `delete from tenant_users where tenant_id='${T1}' and user_id='dddddddd-0000-0000-0000-000000000001'`)
await db.exec(`update tenant_users set role='admin' where tenant_id='${T1}' and user_id='${A}'`)
await db.exec(`delete from tenant_users where tenant_id='${T1}' and user_id='dddddddd-0000-0000-0000-000000000001'`)
check('un líder se puede borrar sin restricciones', (await db.query(`select count(*)::int n from tenant_users where tenant_id='${T1}' and role='leader'`)).rows[0].n === 1)

await db.exec(`set role authenticated; set request.jwt.claim.sub='${B}'`)
check('un líder solo ve su propia fila de tenant_users', (await db.query(`select count(*)::int n from tenant_users`)).rows[0].n === 1)
await db.exec(`set request.jwt.claim.sub='${A}'`)
check('un admin ve todas las filas de su iglesia', (await db.query(`select count(*)::int n from tenant_users`)).rows[0].n >= 2)
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`)

// --- Límite de intentos (0005) ---
const rl = async (k, lim = 3, win = 3600) => (await db.query(`select check_rate_limit('${k}', ${lim}, ${win}) ok`)).rows[0].ok
const first = [await rl('t:a'), await rl('t:a'), await rl('t:a')]
check('los intentos dentro del límite se permiten', first.every(Boolean))
check('el intento siguiente se rechaza', (await rl('t:a')) === false)
check('seguir intentando sigue rechazado', (await rl('t:a')) === false)
check('otra clave tiene su propio contador', (await rl('t:b')) === true)
await db.query(`select check_rate_limit('t:w', 1, 1)`)
check('dentro de la ventana el segundo intento se rechaza', (await rl('t:w', 1, 1)) === false)
await new Promise(r => setTimeout(r, 2100))
check('al pasar la ventana el contador empieza de nuevo', (await rl('t:w', 1, 1)) === true)
await rejects('límite no válido', `select check_rate_limit('x', 0, 60)`)
await rejects('ventana no válida', `select check_rate_limit('x', 5, 0)`)
await rejects('clave vacía', `select check_rate_limit('', 5, 60)`)
await db.exec(`set role authenticated`)
await rejects('authenticated no ejecuta check_rate_limit', `select check_rate_limit('x', 5, 60)`)
check('authenticated no ve filas de rate_limits (RLS sin políticas)', (await db.query(`select count(*)::int n from rate_limits`)).rows[0].n === 0)
await db.exec(`reset role; set role anon`)
await rejects('anon no ejecuta check_rate_limit', `select check_rate_limit('x', 5, 60)`)
await db.exec(`reset role; set role service_role`)
check('service_role sí ejecuta check_rate_limit', (await rl('t:svc')) === true)
await db.exec(`reset role`)

// --- Ventana deslizante (0006), con fechas fijas ---
const at = async (k, t, lim = 10, win = 60) =>
  (await db.query(`select check_rate_limit('${k}', ${lim}, ${win}, '${t}'::timestamptz) ok`)).rows[0].ok
const base = '2030-01-01T00:00:'
let okCount = 0
for (let i = 0; i < 12; i++) if (await at('s:burst', base + '59Z')) okCount++
check('se permiten exactamente 10 y se rechazan los demás (12 intentos)', okCount === 10)
check('justo tras cambiar de ventana NO se reabre el cupo entero (sin ráfaga doble)', (await at('s:burst', '2030-01-01T00:01:01Z')) === false)
let more = 0
while (await at('s:burst', '2030-01-01T00:01:31Z') && more < 20) more++
check('a mitad de ventana se recupera solo parte del cupo (' + more + ')', more >= 4 && more <= 6)
check('pasadas dos ventanas el cupo está libre', (await at('s:burst', '2030-01-01T00:03:00Z')) === true)
const rej1 = await db.query(`select hits from rate_limits where key='s:burst' and window_start='2030-01-01T00:00:00Z'`)
check('los intentos rechazados no suman al contador', rej1.rows[0].hits === 10)

console.log(fails === 0 ? '\nTODO OK' : `\n${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
