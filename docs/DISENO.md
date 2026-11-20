# Ekklesias: diseño del MVP (borrador para revisión)

## Alcance del MVP (fase 1, coste 0, para demostraciones)

Incluye:
- Registro público con consentimientos granulares y enlace personal por miembro.
- Gestión de preferencias y baja por el propio miembro (enlace firmado, sin contraseña).
- Panel con login: lista con búsqueda, filtros por consentimiento y exportación CSV; ficha con historial de consentimientos, quién invitó a quién y registro de accesos.
- Solicitudes de derechos RGPD y supresión (anonimización).
- Multi-tenant: Lifepoint como primera iglesia y datos de demostración ficticios.

No incluye (fases 2 y 3): envío de noticias, grupos operativos, WhatsApp/SMS, push, instalación PWA, facturación.

## URLs (estables: no deben cambiar nunca una vez grabadas en una tarjeta NFC)

| Ruta | Uso |
|---|---|
| `/` | Home de Ekklesias (qué es, demo, contacto). No pertenece a ninguna iglesia. |
| `/c/<slug-iglesia>` | Home de cada iglesia (por ejemplo Lifepoint): presentación y botón "Regístrate". |
| `/m/<código>` | Enlace personal de un miembro (NFC/QR). El código es único globalmente, así la iglesia se deduce del código y la URL no cambia si luego se usan subdominios o dominios propios. |
| `/r/<slug-iglesia>` | Registro general de la iglesia, sin invitador ("lo descubrí por mi cuenta"). Un QR para carteles o redes. |
| `/preferencias/<token>` | Gestión de consentimientos por canal. Token firmado de un solo uso enviado por email. |
| `/baja/<token>` | Baja de un clic desde cualquier mensaje. |
| `/privacidad/<slug-iglesia>` | Política de privacidad de la iglesia. |
| `/derechos/<slug-iglesia>` | Solicitud de acceso, rectificación, supresión, portabilidad u oposición. |
| `/login` | Acceso de administradores y líderes. |
| `/admin` | Panel (resumen). |
| `/admin/miembros`, `/admin/miembros/<id>` | Lista y ficha. |
| `/admin/solicitudes` | Derechos RGPD pendientes con fecha límite. |
| `/admin/ajustes` | Marca de la iglesia, textos legales versionados, usuarios y roles. |

## Flujo de registro (móvil primero)

1. **Bienvenida:** marca de la iglesia, "X te ha invitado" (o mensaje general) y botón de empezar.
2. **Tus datos:** nombre, apellidos, email, **móvil** y fecha de nacimiento. Opcionales y marcados como tales: dirección y bautizado. Si ya hay invitador por enlace se rellena solo; si se entra por `/r/...` se pregunta "¿quién te invitó?" con la opción "lo descubrí por mi cuenta".
3. **Tutor (solo menores de 14):** nombre, email y relación del padre, madre o tutor, y su consentimiento.
4. **Tus permisos:** casillas independientes y sin marcar: 1) guardar mis datos como miembro (obligatoria, con aviso de dato de categoría especial, art. 9), 2) comunicaciones por email / WhatsApp / SMS / push (una casilla por canal), 3) visibilidad ante otros miembros y líderes, 4) uso de fotos, 5) política de privacidad con enlace.
5. **Confirmación:** resumen, su enlace personal para invitar a otros, enlace de preferencias y la opción (no obligatoria) de instalar la app.

Reglas: el móvil es obligatorio para todos, y la comunicación por WhatsApp o SMS sigue siendo una casilla aparte y sin marcar. Cada casilla guarda texto, versión, fecha/hora y origen (`nfc`, `qr`, `link`).

## Modelo de datos

Migración: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

- `tenants`, `tenant_users` (rol `admin` o `leader`), `platform_admins`.
- `members`: datos del miembro, `invite_code` propio, `invited_by` o `discovered_alone`, `registered_via`, `status` (`active` / `erased`).
- `guardians`: tutor de menores de 14.
- `consent_texts`: texto legal versionado por iglesia y finalidad.
- `consent_events`: registro **solo de inserción** de cada concesión o revocación, con versión del texto, origen, hash de IP y si lo dio un tutor. La vista `member_consents_current` da el estado actual.
- `groups`, `group_members`, `campaigns`, `campaign_recipients` (fase 2).
- `rights_requests` (con plazo de un mes), `preference_tokens`, `access_log`.

Decisiones de seguridad:
- **Registro público fuera de RLS:** las altas pasan por el servidor con la clave de servicio, con validación y límite de intentos. No hay políticas para usuarios anónimos.
- **Aislamiento entre iglesias** con claves foráneas compuestas `(id, tenant_id)` y RLS por rol.
- **Líderes:** solo ven a los miembros que aceptaron la visibilidad de sus datos, y no ven los consentimientos de nadie.
- **Supresión** (`erase_member`): anonimiza al miembro, revoca todo y conserva el historial de consentimientos anonimizado como prueba. Este criterio de conservación debe validarlo la revisión legal.
- **Envíos:** el consentimiento se vuelve a comprobar en el momento de enviar, no al crear la campaña.

Migraciones: `0001_init.sql` (esquema) y `0002_register_member.sql` (alta pública atómica y `invited_by_text`).

Pruebas: `pnpm test:db` aplica las migraciones en un Postgres en memoria (PGlite) y ejecuta 31 comprobaciones: estado actual de consentimientos, inmutabilidad, teléfono e idioma, aislamiento entre iglesias, permisos de líder y admin, supresión, y el alta pública (consentimientos obligatorios, menores con tutor, invitador, duplicados, atomicidad y que solo `service_role` pueda ejecutarla).

## Registro: estado actual

Funciona de extremo a extremo en local (comprobado en navegador y en la base de datos): `/r/<slug>` y `/m/<código>`, origen `nfc` / `qr` / `link` por el parámetro `?s=`, detección de menores de 14 años con sección de tutor, un evento de consentimiento por casilla mostrada (también las rechazadas) con versión e idioma del texto, y página de agradecimiento con el enlace personal para invitar.

Decisiones de privacidad en el registro:
- **Correo duplicado:** se muestra el mismo agradecimiento genérico, sin revelar que esa persona ya estaba registrada.
- **Invitador:** con enlace personal se enlaza al miembro; en el registro general es texto libre opcional (así no se listan nombres de otros miembros).
- Se guarda un hash de la IP (con sal) y el agente de usuario como prueba del consentimiento. Conviene que la revisión legal confirme que es proporcionado y fije un plazo de conservación.
- Cookie de idioma (`NEXT_LOCALE`): preferencia de la interfaz, sin seguimiento.

Pendiente en esta pieza: límite de intentos por IP, verificación del correo del tutor, y los textos legales (casillas y política de privacidad) en versión definitiva tras la revisión legal. Las páginas `/privacidad/<slug>` y `/derechos/<slug>` son por ahora un borrador mínimo.

## Idiomas: español, inglés, alemán y árabe

- Las URLs de las tarjetas **no llevan idioma** (`/m/<código>`): el idioma se detecta por el navegador, se puede cambiar con un selector y se recuerda en una cookie. Así la tarjeta sirve para cualquiera.
- El árabe es de derecha a izquierda (RTL): se construye con propiedades CSS lógicas desde el primer día, no como parche posterior.
- Los **textos legales de las casillas se versionan por idioma** (`consent_texts.locale`). El idioma del texto aceptado queda registrado con cada consentimiento. Las cuatro traducciones deben pasar la revisión legal, y hay que decidir qué versión prevalece en caso de discrepancia.
- `members.locale` guarda el idioma preferido para los emails y mensajes futuros.

## Decisiones tomadas

- Sin estado civil. Móvil obligatorio. Idiomas: es, en, de, ar.
- Home separada del registro: `/` para Ekklesias, `/c/<slug>` para cada iglesia, y el registro vive en `/r/<slug>` (general) y `/m/<código>` (personal).

## Panel de administración: estado actual

Login con Supabase Auth (`/login`, email y contraseña) y sesión renovada por `src/proxy.ts`. Todas las consultas del panel usan el cliente del usuario, así que **las políticas RLS son la barrera real**, no el código de las páginas.

- `/admin`: resumen (miembros activos y permisos concedidos; los líderes no ven los permisos).
- `/admin/miembros`: lista con búsqueda por nombre, email o móvil y filtro por permiso concedido. Los líderes solo ven a quien aceptó la visibilidad.
- `/admin/miembros/<id>`: ficha con invitador, a quién ha invitado, tutor e historial completo de consentimientos (solo administradores). Cada consulta de una ficha queda en `access_log`.
- `/admin/miembros/export`: CSV solo para administradores, con protección contra fórmulas de hoja de cálculo y registro en `access_log`.
- El panel está solo en español en el MVP (lo usa el equipo de la iglesia). Pendiente de decidir si se traduce.

Datos de demostración locales: `pnpm seed:demo` crea `admin@lifepoint.example` y `lider@lifepoint.example` (contraseña de demo en el propio script, solo funciona contra Supabase local) y cinco miembros ficticios.

## Preferencias, baja y derechos: estado actual

Migración `0003_preferences_rights.sql`. Todas las funciones públicas solo las ejecuta la clave de servicio; la app las llama desde el servidor.

- **Enlace de preferencias** (`/preferencias/<token>`): un administrador lo genera desde la ficha (válido 7 días) y se lo envía a la persona. Permite cambiar email, WhatsApp, SMS, visibilidad y fotos, con el texto legal vigente en su idioma. Solo se registran los cambios reales y quedan con origen `preferences`. No permite tocar la membresía ni la política de privacidad: eso se hace pidiendo la supresión.
- **Baja** (`/baja/<token>`): al abrir el enlace solo se muestra un botón de confirmar (así los escáneres de enlaces del correo no dan de baja a nadie). Al confirmar retira todos los canales y es idempotente.
- **Tokens:** 244 bits aleatorios, solo se guarda su SHA-256, caducan y distinguen tipo (`preferences` o `unsubscribe`).
- **Derechos** (`/derechos/<slug>`): formulario público con campo trampa. La respuesta es la misma exista o no el email. Las solicitudes llegan a `/admin/solicitudes` con plazo de un mes y aviso de vencimiento. Desde la solicitud se descarga un JSON con los datos de la persona (acceso y portabilidad) y la supresión se hace desde la ficha (con confirmación). Todo queda en `access_log`.

Pendiente: envío real de estos enlaces por email (fase 2, hoy se copian a mano), límite de intentos por IP, verificación de identidad más allá de comparar el email.

## Ajustes del panel: estado actual

`/admin/ajustes` (solo administradores):
- **La iglesia:** nombre, email de contacto (sale en las páginas legales) y color de marca, con validación en el servidor.
- **Textos legales:** se elige permiso e idioma y se publica una **versión nueva** (nunca se edita una existente). Cada idioma lleva su propia numeración. Las personas ya registradas siguen apuntando a la versión exacta que aceptaron; la nueva se muestra solo a quien se registre o cambie sus permisos después. No se publica un texto idéntico al vigente. Cada publicación queda en `access_log`.

Pendiente: gestión de usuarios y roles del panel (hoy se crean con `pnpm seed:demo` o a mano en Supabase), y decidir si hay que pedir de nuevo el consentimiento a los miembros actuales cuando un texto cambia de forma sustancial (criterio para la revisión legal).
