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
    20260425033638_quotes.sql
    20260425034538_quote_acceptance.sql
    20260425035035_passengers_attachments.sql
    20260425035504_reservations.sql
    20260425035813_request_issuance.sql
    20260426032754_bsp_calendar.sql
    20260426034819_request_edit_and_visibility_fix.sql
    20260426035323_update_request_rpc_defaults.sql

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
- **`quote_requests`**: `code` (TD-NNNN por agencia), `status` (11 valores), datos de cliente, datos de viaje, `services` (array de service_type), `notes`, `issued_at` (set por `mark_request_issued`), `bsp_due_date` (set por trigger cuando `issued_at` cambia y la request incluye `flights`). Unique `(agency_id, code)`.
- **`quote_request_dispatches`** (unique `quote_request_id, operator_id`): a qué operadores se envió y cuándo.
- **`quote_request_status_history`**: `from_status`, `to_status`, `changed_by`, `changed_at`, `notes`.

### Cotizaciones
- **`quotes`**: `quote_request_id`, `operator_id`, `status` (submitted/withdrawn/superseded/accepted/rejected), `total_amount`, `currency`, `exchange_rate_usd_ars` (snapshot del MEP cuando currency=ARS), `payment_terms`, `valid_until`, `notes`, `submitted_by`, timestamps. Unique parcial sobre `(quote_request_id, operator_id) where status = 'submitted'`.
- **`quote_items`**: `quote_id`, `sort_order`, `description`, `amount`, `accepted_at` (timestamptz nullable — set cuando la agencia acepta total o parcial). Cascade delete con la quote.

### Pasajeros y attachments
- **`passengers`**: cargados por la agencia, `quote_request_id`, `agency_id`, `full_name`, `passenger_type` (adult/child/infant), `document_type`/`document_number`, `birth_date`, `email`, `phone`, `notes`.
- **`attachments`**: tabla genérica de archivos del expediente. `kind` enum (passenger_doc/reservation/voucher/invoice/file_doc/payment_receipt). `passenger_id` para passenger_doc, `operator_id` para los que sube el operador (reservation/voucher/invoice/file_doc). `storage_path` unique. Bucket privado `attachments` con path convention `{agency_id}/{request_id}/{kind}/{uuid}-{filename}`; storage policies validan membership desde `storage.foldername`.
- **`reservations`**: una por request (unique `quote_request_id`), `operator_id`, `agency_id`, `reservation_code` (PNR/file/locator), `notes`. Insertable solo por el operador con quote `accepted` (validado en RPC).

### Calendario BSP
- **`bsp_calendar`**: `period_code` (PK, ej. `20260101W`), `period_from`, `period_to`, `payment_date`. 48 filas hardcodeadas para Argentina 2026. RLS open-read para `authenticated` (data de referencia pública).

### Enums
- `member_role`: owner, admin, member
- `invitation_kind`: agency_member, operator_member, operator_link
- `invitation_status`: pending, accepted, revoked, expired
- `request_status`: draft, sent, quoted, partially_accepted, accepted, reserved, docs_uploaded, issued, payment_pending, closed, cancelled
- `service_type`: flights, hotel, transfers, excursions, package, cruise, insurance, other
- `currency`: USD, ARS
- `quote_status`: submitted, withdrawn, superseded, accepted, rejected
- `passenger_type`: adult, child, infant
- `attachment_kind`: passenger_doc, reservation, voucher, invoice, file_doc, payment_receipt

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
- `submit_quote(request_id, total_amount, currency, payment_terms, valid_until, notes, exchange_rate_usd_ars, items jsonb)` → uuid. Resuelve operator_id desde dispatches + operator_members del user actual. Marca quote previa del mismo operador como `superseded` (reemplazo automático). Si `request.status = sent`, transiciona a `quoted`.
- `withdraw_quote(quote_id)` → estado `withdrawn`, sólo si la quote está `submitted`.
- `accept_quote(quote_id)` → aceptación total. Marca todos los items como `accepted_at`, otras quotes `submitted` del mismo request → `rejected`, request → `accepted`.
- `accept_quote_items(quote_id, item_ids[])` → aceptación parcial. Si todos los items quedaron aceptados, request → `accepted`; si no, `partially_accepted`.
- `reject_quote(quote_id)` → rechazo manual de una quote.
- `upsert_passenger(...)` → uuid. Crea (si `p_id` null) o edita un pasajero. Solo agencia.
- `delete_passenger(id)`.
- `register_attachment(request_id, kind, storage_path, file_name, mime_type, size_bytes, passenger_id, operator_id)` → uuid. Lado agencia: `operator_id null`. Lado operador: validado por membership + dispatched.
- `delete_attachment(id)` → devuelve `storage_path` para que el client borre el blob.
- `upsert_reservation(request_id, reservation_code, notes)` → uuid. Sólo operador con quote `accepted`. Promueve `accepted/partially_accepted` → `reserved`.
- `mark_request_issued(request_id)` → `reserved/...` → `issued`. Setea `quote_requests.issued_at`. Requiere reservation cargada. Trigger `set_bsp_due_date` calcula `bsp_due_date` si la request incluye `flights`.
- `compute_bsp_due_date(date)` → date. Lookup en `bsp_calendar` por la fecha de emisión.
- `update_quote_request(...)` → void. Edita una solicitud sólo si está en `draft` o `sent`. Misma firma que create excepto el `agency_id`.
- `delete_quote_request(request_id)` → void. Hard delete con cascade a dispatches/history. Sólo si está en `draft` o `sent`.

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

### Iteración 5 — Cotización del operador
Migración `quotes`. Schema `quotes` (status, total_amount, currency USD/ARS, exchange_rate_usd_ars como snapshot del MEP, payment_terms, valid_until, notes) + `quote_items` (sort_order, description, amount). Enums `currency` (USD/ARS) y `quote_status` (submitted/withdrawn/superseded/accepted/rejected). RLS para que ambos lados (agencia de la request, operador miembro del operator) lean. Unique parcial sobre `(request, operator)` cuando status = submitted, complementado con supersede automático en `submit_quote`. RPCs `submit_quote` (recibe items como jsonb, resuelve operator_id desde dispatch + membership) y `withdraw_quote`. Helper `lib/exchange-rate.ts` con dolarapi MEP (revalidate 15m, fallback a null si la API falla). UI operador: cotización activa, form con switch USD/ARS, MEP autollenado pero editable, ítems dinámicos, conversión visible (USD→ARS al MEP, ARS→USD al TC ingresado), reemplazo automático de cotización activa, retiro. UI agencia: cards comparables por operador con total, TC, validez (con flag de vencida), pago, ítems y notas. Transición `sent → quoted` al llegar la primera cotización.

### Iteración 6 — Aceptación (total / parcial)
Migración `quote_acceptance`: agrega `accepted_at` (timestamptz nullable) en `quote_items`. RPCs `accept_quote(quote_id)` (total, marca todos los items), `accept_quote_items(quote_id, item_ids[])` (parcial; si quedan todos aceptados, total) y `reject_quote(quote_id)` (rechazo manual). Side effects: las otras quotes `submitted` del mismo request quedan `rejected` automáticamente. Transición de la request a `accepted` o `partially_accepted` con history. UI agencia: `QuoteCard` cliente con flujo total/parcial (checkboxes en ítems con suma seleccionada en vivo) + rechazar. UI operador: card de "Tu cotización fue aceptada" con detalle de ítems aceptados (parcial muestra los ítems no aceptados tachados).

### Iteración 7 — Pasajeros + attachments + storage
Migración `passengers_attachments`: tabla `passengers` (multi-pasajero por request, ligada a `quote_request_id` y `agency_id`), tabla genérica `attachments` (con `kind` enum), bucket privado `attachments` con storage policies que validan agency_id desde `(storage.foldername(name))[1]` y operator dispatched desde `[2]`. Path convention `{agency_id}/{request_id}/{kind}/{uuid}-{filename}`. Enums `passenger_type` (adult/child/infant) y `attachment_kind`. RPCs `upsert_passenger`, `delete_passenger`, `register_attachment` (lado agencia con `operator_id null`, lado operador con membership), `delete_attachment` (devuelve `storage_path` para que el client borre el blob). Helpers `lib/passengers.ts` con labels, opciones, `buildAttachmentPath`, `formatBytes`. UI agencia (cuando la request llegó a `accepted/partially_accepted/...`): `PassengersPanel` cliente con alta/edición inline, lista, eliminación, subida de docs por pasajero (uploads vía `supabase.storage` browser client → RPC para registrar metadata). UI operador: vista read-only de pasajeros con sus docs descargables (signed URLs server-side).

### Iteración 8 — Reserva del operador
Migración `reservations`: tabla `reservations` (unique por `quote_request_id`) con `reservation_code`, `notes`, `agency_id`, `operator_id`. RLS con policies symmetric (agency members + operator members). RPC `upsert_reservation` valida que el operador tenga quote `accepted` y promueve la request `accepted/partially_accepted → reserved` con history. UI operador: `ReservationPanel` cliente con form para code+notas, edición y subida de comprobantes (`OperatorAttachmentsBlock` reusable, kind `reservation`). UI agencia: `ReservationView` read-only con código, notas, operador y comprobantes descargables.

### Iteración 9 — Emisión
Migración `request_issuance`: agrega `issued_at` en `quote_requests` y RPC `mark_request_issued` (requiere quote `accepted` + reserva cargada; transiciona a `issued` con history). UI operador: `IssuancePanel` con tres bloques (`voucher`, `invoice`, `file_doc`) — cada uno usa `OperatorAttachmentsBlock` para subir/borrar — y un botón "Marcar como emitida". UI agencia: `IssuanceView` read-only con grid de los tres tipos y badge "Emitida {fecha}".

### Iteración 10 — Vencimiento BSP
Migración `bsp_calendar`: tabla `bsp_calendar` con los 48 períodos del calendario IATA Argentina 2026 (cada período = `period_code`, `period_from`, `period_to`, `payment_date`). RLS open-read para `authenticated`. Agrega `bsp_due_date date` a `quote_requests`. Función `compute_bsp_due_date(date)` resuelve el día de pago para una fecha de emisión. Trigger `set_bsp_due_date` (BEFORE UPDATE) la setea cuando `issued_at` pasa de NULL a NOT NULL **y** `services` contiene `flights`. La fecha se evalúa en `America/Argentina/Buenos_Aires` para no corrernos por UTC. Si la emisión cae fuera del calendario cargado (ej. 2027), `bsp_due_date` queda NULL hasta que se cargue el calendario nuevo. UI: helper `lib/bsp.ts` con semáforo (verde > 7d, amarillo ≤ 7d, rojo ≤ 1d, gris vencido) y componente `BspBadge` con dos variantes: `compact` (lista) y `full` (header de detalle, muestra fecha + días). Mostrado simétrico en ambos lados (agencia y operador), en list pages y detail headers.

### Iteración 11a — Edición/eliminación de solicitudes + fix RLS
Migración `request_edit_and_visibility_fix` + `update_request_rpc_defaults`. Agrega RPCs `update_quote_request` y `delete_quote_request`, ambas restringidas a status `draft` o `sent` (después de eso queda congelada porque hay cotizaciones en juego). Delete hace cascade manual a `quote_request_dispatches` y `quote_request_status_history`. Bug fix: las policies de `agencies` y `operators` no permitían visibilidad cross-tenant cuando había dispatch — el operador no podía ver el nombre de la agencia que lo despachó (el `agencies!inner` join devolvía vacío). Nuevas policies `agencies_select_linked_or_dispatched_operator` y `operators_select_dispatched_by_agency` arreglan eso. UI: nueva página `/agency/requests/[id]/edit` que reusa el form (`_components/request-form.tsx` extraído del antiguo `new-request-form.tsx` con prop `mode`). Botones "Editar" y "Eliminar" en el header del detalle, visibles sólo cuando el status lo permite. Eliminar usa `confirm()` nativo y borra del todo (distinto de "Cancelar" que mantiene el registro como `cancelled`).

## Estado: iteraciones pendientes

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
