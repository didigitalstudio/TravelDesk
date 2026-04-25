@AGENTS.md

# Travel Desk

SaaS para agencias de viaje y operadores turísticos. Centraliza el ciclo completo de un viaje: cotización → aceptación → documentación → emisión → cobro. Dos portales con login compartido pero rutas y datos aislados por RLS.

## Stack

- **Frontend / Backend:** Next.js 16.2 (App Router, Turbopack) + TypeScript + Tailwind v4
- **DB / Auth / Storage:** Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- **Hosting:** Vercel (auto-deploy desde `main`)
- **Mail (planeado):** Resend — todavía no integrado, decisión postergada hasta tener API key
- **Bot Telegram (planeado):** grammY (TS) como Vercel Function — no empezado
- **PDF (planeado):** `@react-pdf/renderer` — no empezado

Versiones: Node 25, Next 16.2.4, React 19.2.4, Supabase JS 2.104.1.

## Recursos cloud

| Servicio | Identificador | URL |
|---|---|---|
| GitHub | `didigitalstudio/TravelDesk` (público) | https://github.com/didigitalstudio/TravelDesk |
| Supabase | proyecto `dzumfegkwkewdfhynrry`, org `lqxytwtallsrmmolkhwq`, región `sa-east-1` | https://supabase.com/dashboard/project/dzumfegkwkewdfhynrry |
| Vercel | scope `didigitalstudio`, proyecto `traveldesk` | https://vercel.com/didigitalstudio/traveldesk |
| **Producción** | — | **https://traveldesk-two.vercel.app** |

Las tres CLIs (`gh`, `vercel`, `supabase`) están autenticadas como `didigitalstudio` (cuenta personal renombrada desde `desabaires` el 2026-04-24). Vercel: usar `VERCEL_AGENT=no vercel <cmd>` para evitar prompts de plugins.

## Convenciones del repo

### Workflow git
- Trabajamos **directo en `main`**, sin feature branches ni PRs internos.
- `vercel deploy --prod` y los pushes a main pre-autorizados (no reconfirmar). Acciones realmente destructivas (force-push, reset --hard, dropear DB, borrar repo) sí requieren confirmación.
- Cada iteración cerrada termina con un push a `main` y queda live en Vercel.

### Convenciones de código
- Server actions para todos los forms (no API routes salvo OAuth callbacks).
- Server components por default; client components sólo cuando hace falta interactividad.
- Las server actions hacen `redirect(...)` al final del happy path para evitar render con stale data.
- Tipos de Supabase regenerados con `supabase gen types typescript --project-id dzumfegkwkewdfhynrry --schema public > types/supabase.ts` después de cada migración.
- Clientes Supabase tipados con `<Database>` siempre.
- Sin emojis en código ni copy del producto (preferencia explícita del usuario para texto técnico).
- Idioma del producto: **español rioplatense** ("ingresá", "vinculá", "cargá").
- Sin docstrings largos ni comments WHAT — solo WHY cuando es no-obvio.

### Comandos clave
```bash
npm run dev                # next dev
npm run build              # next build (turbopack)
npm run seed:demo          # crea/actualiza users demo y los vincula
npm run demo:links         # regenera magic links de demo (si vencen los passwords no hace falta)
supabase db push           # aplica migraciones a DB remota
supabase gen types typescript --project-id dzumfegkwkewdfhynrry --schema public > types/supabase.ts
supabase config push       # sincroniza supabase/config.toml con remoto (auth URLs, etc.)
```

## Estructura del proyecto

```
app/
  layout.tsx                 # Root layout (es-AR, fonts Geist)
  page.tsx                   # Decide redirect según session + tenant
  login/                     # Email+password (default) y magic link
  onboarding/                # Crear agencia u operador (RPC)
  invite/[token]/            # Landing pública para aceptar invitaciones
  auth/callback/route.ts     # Intercambia OTP code por session
  auth/signout/route.ts      # POST sign out
  (agency)/agency/
    layout.tsx               # Header con nav: Inicio · Solicitudes · Operadores
    page.tsx                 # Dashboard con cards
    operators/               # Vincular operadores (invitaciones operator_link)
    requests/
      page.tsx               # Tabla
      new/                   # Form + envío
      [id]/                  # Expediente, dispatches, historial, cancelar
  (operator)/operator/
    layout.tsx               # Header con nav: Inicio · Solicitudes · Agencias
    page.tsx                 # Dashboard con banner de invitaciones pendientes
    agencies/                # Aceptar invitaciones, listar agencias vinculadas
    requests/
      page.tsx               # Tabla de solicitudes recibidas
      [id]/                  # Detalle (cotización deshabilitada hasta iter 5)

components/
  copy-button.tsx            # Client: copia al clipboard con feedback
  status-badge.tsx           # Server: badge con tone por estado

lib/
  invite.ts                  # buildInviteUrl
  requests.ts                # SERVICE_LABELS, STATUS_LABELS, formatters, paxBreakdown
  tenant.ts                  # getCurrentTenant() — devuelve agency | operator | none
  supabase/
    client.ts, server.ts, middleware.ts

middleware.ts                # updateSession — refresca cookies en cada request
                             # ⚠ Next 16 deprecó "middleware" → "proxy"; warning ignorado por ahora

scripts/
  seed-demo.ts               # Idempotente: users + tenants + memberships + link
  regen-demo-links.ts        # Magic links de fallback si se olvidan passwords

supabase/
  config.toml                # Auth: site_url + redirect_urls para prod y local
  migrations/
    20260425003710_init_tenancy.sql
    20260425005143_add_invitation_preview.sql
    20260425011158_quote_requests.sql
    20260425011820_quote_requests_rpc_defaults.sql

types/supabase.ts            # Generado, no editar a mano

legacy/leo-cotizador.html    # HTML standalone original. Conservar hasta confirmar migración o descarte.
```

## Schema de DB (estado actual)

### Tenancy
- **`agencies`**: `id`, `name`, `slug` unique, `brand_color`, `brand_logo_url`, `request_count`, timestamps
- **`operators`**: `id`, `name`, `slug` unique, `contact_email`, timestamps
- **`agency_members`** (PK `agency_id, user_id`): `role` (owner/admin/member)
- **`operator_members`** (PK `operator_id, user_id`): `role`
- **`agency_operator_links`** (PK `agency_id, operator_id`): `created_by`
- **`invitations`**: `kind` (agency_member/operator_member/operator_link), `email`, `status`, `token`, `expires_at` (14 días default), `agency_id`/`operator_id` según kind, `role`

### Solicitudes
- **`quote_requests`**: `code` (TD-NNNN por agencia), `status` (11 valores), datos de cliente, datos de viaje, `services` (array de service_type), `notes`. Unique `(agency_id, code)`.
- **`quote_request_dispatches`** (unique `quote_request_id, operator_id`): a qué operadores se envió y cuándo.
- **`quote_request_status_history`**: `from_status`, `to_status`, `changed_by`, `changed_at`, `notes`.

### Enums
- `member_role`: owner, admin, member
- `invitation_kind`: agency_member, operator_member, operator_link
- `invitation_status`: pending, accepted, revoked, expired
- `request_status`: draft, sent, quoted, partially_accepted, accepted, reserved, docs_uploaded, issued, payment_pending, closed, cancelled
- `service_type`: flights, hotel, transfers, excursions, package, cruise, insurance, other

### RLS
Todas las tablas tienen RLS habilitado. Helpers `security definer` con `set search_path = public` para evitar recursión:
- `is_agency_member(uuid)`, `is_agency_admin(uuid)`
- `is_operator_member(uuid)`, `is_operator_admin(uuid)`
- `is_operator_dispatched_to_request(uuid)` — para que un operador vea sólo las solicitudes que se le despacharon

### RPCs (todas `security definer`, grant a `authenticated`)
- `create_agency(name, slug)` → uuid
- `create_operator(name, slug, contact_email default null)` → uuid
- `accept_invitation(token)` → jsonb `{kind, agency_id, operator_id}`
- `get_invitation_preview(token)` → datos de la invitación (lookup público sin exponer la tabla)
- `pending_invitations_for_email(email)` → invitaciones pendientes para mostrar en dashboard
- `create_operator_link_invitation(agency_id, email)` → `{id, token}`
- `revoke_invitation(invitation_id)`
- `create_quote_request(agency_id, client_name, destination, ...)` → uuid; genera `code` = `TD-NNNN`
- `send_quote_request(request_id, operator_ids[])` → valida que TODOS los operators estén vinculados a la agencia, inserta dispatches con upsert, cambia status `draft` → `sent`
- `cancel_quote_request(request_id, notes default null)`

## Auth

- **Métodos:** email+password (default en el form) y magic link (segunda pestaña).
- **Signup vía magic link**: `shouldCreateUser: true` en `signInWithOtp`.
- **Onboarding**: después del primer login sin tenant, redirige a `/onboarding` donde el user crea agencia o operador.
- **Email confirmation**: deshabilitado (`enable_confirmations = false`). El magic link en sí ya valida.
- **`?next=` round-trip**: `/login?next=/invite/<token>` preserva el destino después del magic link.
- **Tenant routing**: si el user es member de una agencia, root `/` redirige a `/agency`. Si es de un operador, a `/operator`. Si es ambos, gana agencia (no hay account switcher todavía).

## Cuentas demo (públicas, compartibles con testers)

URL: https://traveldesk-two.vercel.app/login

| Rol | Email | Password |
|---|---|---|
| Agencia Demo Pública | `agencia-demo@traveldesk.test` | `DemoAgencia2026` |
| Operador Demo Público | `operador-demo@traveldesk.test` | `DemoOperador2026` |

Las dos cuentas ya están vinculadas. Para regenerar/resetear corré `npm run seed:demo` (idempotente, los passwords se reescriben en cada corrida).

`SUPABASE_SERVICE_ROLE_KEY` está en `.env.local` (gitignored). Si se pierde, sacarla con `supabase projects api-keys --project-ref dzumfegkwkewdfhynrry -o json` y filtrar por `name=service_role`.

## Estado: iteraciones cerradas

### Iteración 1 — Schema de tenancy + RLS
Migración `init_tenancy`. Tablas de agencias, operadores, memberships, invitaciones, vínculos. RLS y helpers. RPCs `create_agency`, `create_operator`, `accept_invitation`.

### Iteración 2 — Auth + onboarding
Magic link login, `/auth/callback`, `/auth/signout`, `/onboarding` con creación de tenant, layouts y guards de `/agency` y `/operator`, helper `getCurrentTenant`, redirect logic en root.

### Iteración 3 — Vinculación agencia↔operador
Migración `add_invitation_preview` con RPCs `get_invitation_preview`, `pending_invitations_for_email`, `create_operator_link_invitation`, `revoke_invitation`. UI en `/agency/operators` (invitar, listar, revocar) y `/operator/agencies` (aceptar, listar). Landing `/invite/[token]`. Banner en `/operator` cuando hay invitaciones pendientes. Sin envío de mail — link copiable. Scripts `seed-demo` y `demo:links` para data demo aislada.

**+ Add-on:** Login con email+password + tabs en el form. Passwords fijos para los users demo via Admin API.

### Iteración 4 — Solicitudes de cotización (núcleo)
Migración `quote_requests` + `quote_requests_rpc_defaults`. Schema `quote_requests`, `quote_request_dispatches`, `quote_request_status_history`. Enums `request_status` y `service_type`. RPCs `create_quote_request`, `send_quote_request`, `cancel_quote_request`. UI lado agencia (lista, form de creación con selección de operadores, expediente con historial, dispatch panel, cancelar) y lado operador (lista, detalle).

## Estado: iteraciones pendientes

### Iteración 5 — Cotización del operador
- Schema: `quotes` (precio total, currency, condiciones de pago, validez, status), `quote_items` (para aceptación parcial: descripción, monto, currency).
- RPCs: `submit_quote`, `withdraw_quote`.
- UI lado operador: form de cotización en `/operator/requests/[id]/quote`. Validity date, payment terms (texto libre o enum corto), items.
- UI lado agencia: ver cotizaciones recibidas en el expediente de la solicitud (cards comparables si vienen de varios operadores).
- Estado de la solicitud pasa a `quoted` cuando llega la primera cotización.

### Iteración 6 — Aceptación (total / parcial)
- Schema: `quote_acceptances` (qué items aceptó la agencia), o flag `accepted` por item.
- RPCs: `accept_quote_total`, `accept_quote_items(quote_id, item_ids[])`, `reject_quote`.
- Status: `accepted` o `partially_accepted`.
- Side effect: deshabilita las cotizaciones de los otros operadores en esa solicitud (o las marca como "no seleccionadas").

### Iteración 7 — Documentación de pasajeros
- Schema: `passengers` (nombre, dni, fecha nacimiento, tipo, contacto), `attachments` con kind `passenger_doc`.
- Storage: bucket `passenger-docs` con RLS por agencia y operador despachado.
- UI agencia: cargar pasajeros una vez aceptado el servicio, subir DNI/pasaporte.
- UI operador: descargar docs para emitir.

### Iteración 8 — Reserva del operador
- Schema: `reservations` (operator_id, quote_request_id, reservation_code, attached_at), `attachments` kind `reservation`.
- UI operador: subir comprobante de reserva.
- Status: pasa a `reserved`.

### Iteración 9 — Emisión: voucher / pasaje / factura / file
- Schema: `attachments` con kinds `voucher`, `invoice`, `file_doc`.
- UI operador: subir cada pieza, marcar emitida.
- Status: pasa a `issued`.
- Status: pasa a `docs_uploaded` cuando todos los docs requeridos están.

### Iteración 10 — Vencimiento BSP
- Schema: `bsp_calendar` (fecha emisión → fecha vencimiento). Hardcodear el calendario IATA del año.
- Cálculo: en `quote_requests`, columna calculada o trigger que resuelve `bsp_due_date` cuando se setea `issued_at`.
- UI: badge en lista y detalle, con flag de proximidad (verde > 7d, amarillo ≤ 7d, rojo ≤ 1d).

### Iteración 11 — Cuenta corriente
- Schema: `payments` (agency↔operator, amount, currency, due_date, paid_at, receipt_url, verified_at), o vista calculada desde quote_requests aceptados/issued.
- UI agencia: vista de saldos por operador, subir comprobante, marcar pagado.
- UI operador: vista de saldos por agencia, verificar comprobantes.
- Status: pasa a `payment_pending` y luego `closed`.

### Iteración 12 — Resend (mail)
- Integración con `RESEND_API_KEY` (env var en Vercel cuando esté disponible).
- Triggers: invitación creada, solicitud despachada, cotización recibida, aceptación, vencimiento BSP próximo.
- Templates con branding de la agencia (color, logo).
- Tracking: usar webhooks de Resend para registrar `delivered`, `opened`, `bounced` en una tabla `email_events`.

### Iteración 13 — PDF presupuesto para cliente final
- `@react-pdf/renderer` server-side.
- Endpoint `/agency/requests/[id]/pdf` que genera PDF de presupuesto.
- Margen de la agencia: campo editable antes de generar (no debe verlo el operador).
- Branding: usar `agencies.brand_color` y `brand_logo_url`.

### Iteración 14 — Bot de Telegram
- grammY (TS) como Vercel Function en `/api/telegram-webhook`.
- Vincular chat al user (tabla `telegram_links`).
- Comando `/cotizar` con prompt en lenguaje libre que parsea con LLM o template.
- Crea `quote_request` y opcionalmente despacha.

### Iteración 15 — Resumen de viaje al cliente final
- UI agencia: botón "Enviar resumen al cliente" en expediente, con itinerario, fechas y attachments.
- Mail (vía Resend) o link público read-only del expediente.

### Iteración 16 — CRM básico (Fase 2)
- Schema: `clients` (agency_id, full_name, email, phone, dni, dob, address, notes).
- En `quote_requests`, FK opcional `client_id` (los datos de cliente actuales viven en columnas, queda doble fuente — decidir si normalizar o mantener snapshot).
- UI: `/agency/clients` con ficha, historial de viajes, attachments asociados.
- UI: en form de nueva solicitud, autocompletar desde clientes existentes.

### Iteración 17 — Google Drive (Fase 3)
- OAuth Drive por agencia.
- Mirror de attachments al Drive de la agencia, organizado por cliente y expediente.

### Iteración 18 — Notificaciones avanzadas y reportes
- Notificaciones in-app (campana con counter).
- Dashboard analítico: solicitudes/mes, conversion rate, vencimientos próximos.

## Decisiones arquitectónicas tomadas

- **Memberships en 2 tablas (no 1 polimórfica):** FK directas, RLS más limpia, cada lado puede crecer con columnas propias. Un mismo email puede ser admin de una agencia y member de un operador sin choque.
- **Slug con sufijo random:** `slugify(name) + random4chars` para evitar colisiones sin pedir input al user.
- **`code` por agencia:** `TD-NNNN` con counter en `agencies.request_count`. Update + RETURNING garantiza secuencialidad sin race.
- **`accept_invitation(operator_link)`** exige que el invitado YA tenga un operador donde sea admin. Si llega un user nuevo, primero pasa por onboarding (crea operador) y después acepta.
- **RLS para operador:** ve la solicitud sólo si existe un dispatch a él (`is_operator_dispatched_to_request`). No tiene acceso a otras solicitudes de la agencia.
- **Sin email todavía:** las invitaciones se entregan como link copiable. Resend está plan iter 12.
- **Tabla única `attachments`** (planeada): un kind enum (`passenger_doc | reservation | voucher | invoice | file_doc | payment_receipt`) con FK a `quote_request_id`. Decisión: no abrir tabla por tipo.

## Cosas a tener cuidado

- **El warning Next 16** "middleware → proxy" todavía no lo migré. Cuando se haga, renombrar `middleware.ts` a `proxy.ts` y actualizar el matcher en `config`.
- **`request_count`** en agencias se incrementa incluso si después se cancela la solicitud (códigos pueden tener gaps). Aceptable.
- **`gen_random_uuid()`** funciona porque está en el search_path de Supabase. **`gen_random_bytes()` NO** (no está en el search_path para roles auth). Para tokens random, concatenar dos UUIDs sin guiones.
- **Service role key** está en `.env.local` (gitignored). NO commitearla. Si se necesita en Vercel para algún endpoint, agregarla con `vercel env add SUPABASE_SERVICE_ROLE_KEY production`.
- El user `aguducculi@gmail.com` con la "Agencia Demo" original (creada en iter 2) sigue activo y es independiente de las cuentas demo públicas. No tocarlo a menos que el usuario lo pida.
