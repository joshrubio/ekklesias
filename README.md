# Ekklesias

Registro de miembros para iglesias, pensado como servicio para varias (multi-tenant). La primera iglesia es **Lifepoint**.

Cada persona se registra desde su móvil con un enlace personal (tarjeta NFC o QR). Queda constancia de quién invitó a quién y de cada permiso que concede, con texto, versión, fecha y origen. El equipo de la iglesia usa un panel con login para consultar y gestionar los datos.

> **Estado: MVP para demostraciones, solo con datos ficticios.** Los textos legales son un borrador pendiente de revisión legal. No usar con datos reales de personas hasta cumplir la lista de "Antes de usar datos reales" más abajo.

## Qué incluye

- **Registro público** (`/r/<iglesia>` y `/m/<código>`): formulario móvil en español, inglés, alemán y árabe (con escritura de derecha a izquierda). Siete permisos independientes y sin marcar de antemano. Los menores de 14 años necesitan los datos y el consentimiento de un tutor.
- **Enlace personal**: cada miembro recibe uno para invitar a otros, y el alta guarda quién invitó a quién.
- **Preferencias y baja** (`/preferencias/<token>`, `/baja/<token>`): el miembro cambia o retira permisos sin contraseña, con enlaces de caducidad corta.
- **Derechos RGPD** (`/derechos/<iglesia>`): formulario público y bandeja en el panel con plazo de un mes, descarga de datos en JSON y supresión (anonimización).
- **Panel** (`/login`, `/admin`): lista con búsqueda y filtro por permiso, ficha con historial completo de consentimientos, exportación CSV, ajustes de la iglesia, textos legales versionados y gestión de usuarios y roles. Los administradores lo ven todo; los líderes solo ven a quien aceptó ser visible.

## Requisitos

- Node.js 20 o superior y [pnpm](https://pnpm.io)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) en marcha (para Supabase en local)

## Puesta en marcha

```bash
pnpm install
npx supabase start
```

`supabase start` imprime las claves locales. Copia `.env.example` a `.env.local` y rellénalo:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: la clave `Publishable` que imprime `supabase start`.
- `SUPABASE_SECRET_KEY`: la clave `Secret`. Solo se usa en el servidor, nunca en el navegador.
- `IP_HASH_SALT`: una cadena aleatoria larga (sirve para guardar un hash de la IP en lugar de la IP).

Carga el esquema, los textos legales de borrador y los datos de demostración, y arranca la app:

```bash
pnpm demo:reset
pnpm dev
```

`pnpm demo:reset` **borra la base local** y la deja como nueva: esquema, la iglesia Lifepoint, los textos de los permisos, dos usuarios del panel y siete miembros ficticios (dos invitados por Lucía, uno de ellos menor con tutor). Solo funciona contra Supabase local.

La app queda en http://localhost:3000.

## Guion de demostración

Usuarios del panel (solo en local): `admin@lifepoint.example` y `lider@lifepoint.example`, contraseña `demo-ekklesias-2026`.

1. **Home de la plataforma** (`/`) y **home de la iglesia** (`/c/lifepoint`). Cambia el idioma con el selector y enseña el árabe en RTL.
2. **Registro general** (`/r/lifepoint?s=qr`): rellena el formulario. Fíjate en que ninguna casilla viene marcada, en que las dos obligatorias explican el motivo y en que se pregunta cómo conoció la iglesia.
3. **Menor de 14 años**: pon una fecha de nacimiento reciente y aparece la sección del tutor.
4. **Gracias**: al terminar se ve su enlace personal. Ábrelo en otra pestaña (`/m/<código>?s=nfc`): saluda con "X te ha invitado" y no vuelve a preguntar quién le invitó.
5. **Email repetido**: registra otra vez el mismo email. La página es idéntica y no revela que ya existía.
6. **Panel** (`/login` con el administrador): resumen, lista, búsqueda y filtro por permiso. Abre una ficha: quién la invitó, a quién ha invitado y el historial de consentimientos, con la versión del texto aceptado.
7. **Enlace de preferencias**: en una ficha, "Enlace de preferencias". Ábrelo en una ventana privada, cambia un permiso y guarda. Vuelve a la ficha: el cambio aparece en el historial con origen `preferences`.
8. **Baja de un clic**: genera un "Enlace de baja", ábrelo (no hace nada al abrirlo) y confirma. Se retiran email, WhatsApp y SMS.
9. **Derechos**: envía una solicitud desde `/derechos/lifepoint` con el email de un miembro. En `/admin/solicitudes` aparece con su plazo. Descarga sus datos en JSON.
10. **Supresión**: desde la ficha de otro miembro, "Suprimir". Queda anonimizado y sin permisos, y se conserva la prueba de consentimiento sin datos identificativos.
11. **Ajustes**: publica una versión nueva de un texto legal. Las personas ya registradas conservan la versión que aceptaron.
12. **Líder**: entra como `lider@lifepoint.example`. Solo ve a quien aceptó la visibilidad y no ve permisos ni solicitudes.

Para repetir la demo desde cero: `pnpm demo:reset`.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Arranca la app en desarrollo |
| `pnpm build` | Compila para producción |
| `pnpm test:db` | Prueba el esquema en un Postgres en memoria (no necesita Docker) |
| `pnpm db:reset` | Recrea la base local con las migraciones y el seed |
| `pnpm seed:demo` | Crea los usuarios del panel y los miembros ficticios |
| `pnpm demo:reset` | `db:reset` y `seed:demo` |

## Estructura

| Ruta | Contenido |
|---|---|
| `supabase/migrations` | Esquema Postgres, seguridad por filas (RLS) y funciones |
| `supabase/seed.sql` | Iglesia Lifepoint y textos legales de borrador |
| `supabase/tests` | Pruebas del esquema con PGlite |
| `src/app` | Rutas: registro, páginas legales, preferencias, baja, login y panel |
| `src/lib` | Acciones de servidor, clientes de Supabase y consultas |
| `src/i18n`, `messages` | Idiomas (es, en, de, ar) |
| `docs/DISENO.md` | Diseño, decisiones de seguridad y estado |

## Decisiones que conviene conocer

- **La seguridad vive en la base de datos.** El panel consulta con la sesión de cada usuario, así que las políticas RLS son la barrera real, no el código de las páginas.
- **El registro público no usa la clave anónima.** Pasa por el servidor, que llama a una función de Postgres con la clave de servicio y guarda todo en una sola transacción.
- **El historial de consentimientos solo se añade.** Nunca se edita ni se borra. Los textos legales se versionan.
- **Un email repetido no se revela.** La respuesta es idéntica en ambos casos.

## Antes de usar datos reales

1. Revisión legal de los siete textos en los cuatro idiomas y de la política de privacidad (la pertenencia a una iglesia es dato de categoría especial, art. 9 RGPD).
2. Verificación del email del tutor (el límite de intentos ya está).
3. Copias de seguridad propias y cifradas, y alojamiento en la UE.
4. Dominio propio registrado (las URLs grabadas en tarjetas NFC no deben cambiar nunca).
5. Plazo de conservación del hash de IP y del agente de usuario.

El diseño y las decisiones de seguridad están en `docs/DISENO.md`.
