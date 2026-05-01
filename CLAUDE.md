@AGENTS.md

# Travel Desk

SaaS para agencias de viaje y operadores turísticos. Centraliza el ciclo completo de un viaje: cotización → aceptación → documentación → emisión → cobro. Dos portales con login compartido pero rutas y datos aislados por RLS.

## Stack

- **Frontend / Backend:** Next.js 16.2 (App Router, Turbopack) + TypeScript + Tailwind v4
- **DB / Auth / Storage:** Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- **Hosting:** Vercel (auto-deploy desde `main`)
- **Mail:** Resend (`notificaciones@didigitalstudio.com`) — `lib/mail/send.ts` y `lib/mail/templates.ts`. `sendMailSafe` nunca rompe el flow del action.
- **Bot Telegram:** grammY como route handler en `/api/telegram/webhook`. Setup vía GET `/api/telegram/setup?secret=...`. Bot: [@traveld_bot](https://t.me/traveld_bot).
- **PDF:** `@react-pdf/renderer` server-side, runtime `nodejs`. Ruta `/agency/requests/[id]/pdf`.
- **Google Drive:** OAuth scope `drive.file`. Mirror manual via `lib/google/sync.ts` (desde el botón "Sincronizar a Drive" del expediente).

Versiones: Node 25, Next 16.2.4, React 19.2.4, Supabase JS 2.104.1, Resend 6.x, grammY 1.x, googleapis 144.x.

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
    20260501013632_payments.sql
    20260501021801_clients.sql
    20260501021909_drop_old_update_quote_request.sql
    20260501022614_member_emails.sql
    20260501023054_client_summary.sql
    20260501023554_telegram_integration.sql
    20260501023928_google_drive.sql
    20260501024341_notifications.sql

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

### Cuenta corriente
- **`payments`**: una fila por request issued (`unique quote_request_id`). `agency_id`, `operator_id`, `amount`, `currency`, `due_date` (= `bsp_due_date` cuando hay vuelos), `receipt_uploaded_at`, `verified_at`, `verified_by`, `notes`. Trigger `create_payment_on_issued` la genera al pasar a `issued`. Backfill incluido para requests previos.

### CRM
- **`clients`** (por agencia): `full_name`, `email` (citext), `phone`, `document_type`, `document_number`, `birth_date`, `address`, `notes`. RLS por `agency_id`. `quote_requests.client_id` FK opcional (los snapshot `client_name/email/phone` se mantienen para no mutar presupuestos históricos).

### Mail / notificaciones
- **`notifications`**: `user_id`, `kind`, `title`, `body`, `link`, `read_at`, `created_at`. Una fila por user/evento, RLS only-own. Inserts vía RPCs `notify_agency_members` / `notify_operator_members` (validan que el caller pertenezca al tenant relacionado).

### Telegram
- **`telegram_links`** (PK `user_id`): `chat_id`, `username`. RLS only-own. Lo que ata el chat con la cuenta.
- **`telegram_link_codes`**: códigos de 6 chars con TTL de 15 min. Sin policies abiertas — todo via RPC.

### Google Drive
- **`agency_google_drive_connections`** (PK `agency_id`): `refresh_token` (encrypted at rest por Postgres), `drive_folder_id`, `drive_folder_name`. Sólo admins de la agencia pueden ver/borrar.
- **`attachment_drive_files`** (PK `attachment_id`): `drive_file_id`, `drive_file_url`. Para no duplicar al sincronizar.

### Resumen al cliente
- **`quote_requests.client_summary_token`** (uuid, unique parcial): token público para `/trip/[token]`.

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
- `update_quote_request(...)` → void. Edita una solicitud sólo si está en `draft` o `sent`. Acepta `p_client_id` opcional. El overload viejo (sin `p_client_id`) se dropeó en `20260501021909`.
- `delete_quote_request(request_id)` → void. Hard delete con cascade a dispatches/history. Sólo si está en `draft` o `sent`.
- `register_payment_receipt(request_id)` → marca `payments.receipt_uploaded_at` y promueve `issued → payment_pending`. Requiere al menos un attachment `payment_receipt`.
- `unregister_payment_receipt(request_id)` → revierte si todavía no fue verificado.
- `verify_payment(payment_id, notes)` → operador verifica el pago y la request pasa a `closed`.
- `upsert_client(...)` / `delete_client(id)` → CRM básico, agency-scoped.
- `agency_member_emails(agency_id)` / `operator_member_emails(operator_id)` → arrays de emails para mandar mails sin exponer service_role. Validan que el caller pertenezca al tenant o tenga relación dispatched/linked.
- `notify_agency_members(agency_id, kind, title, body, link)` / `notify_operator_members(...)` → encolan una notificación por miembro. Mismo gate de validación que los emails.
- `mark_notification_read(id)` / `mark_all_notifications_read()` → only-own.
- `generate_client_summary_token(request_id)` → idempotente, devuelve uuid. `revoke_client_summary_token(request_id)`.
- `get_trip_summary(token)` → jsonb pública para `/trip/[token]` (granted to anon).
- `generate_telegram_link_code()` (auth) → string de 6 chars con TTL 15min. `consume_telegram_link_code(code, chat_id, username)` (anon) → boolean. `telegram_create_request(chat_id, client_name, destination, notes)` (anon) → uuid+code+agency_id, valida que el chat esté linkeado. `telegram_list_recent_requests(chat_id, limit)`.
- `upsert_agency_drive_connection(agency_id, refresh_token, folder_id, folder_name)` → upsert OAuth refresh token. `set_agency_drive_folder(agency_id, folder_id, folder_name)`. `get_agency_drive_refresh_token(agency_id)` (only members). `register_drive_sync(attachment_id, drive_file_id, drive_file_url)`.

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

### Iteración 11 — Cuenta corriente
Migración `payments`. Tabla `payments` (una fila por request emitida) con `amount`, `currency`, `due_date` (set automáticamente al `bsp_due_date` cuando aplica), `receipt_uploaded_at`, `verified_at`, `verified_by`. Trigger `create_payment_on_issued` (AFTER UPDATE) inserta la fila al pasar a `issued`, con monto = sum de items aceptados de la quote ganadora. Backfill para requests existentes en `issued/payment_pending/closed`. RPCs `register_payment_receipt` (agencia, requiere al menos un `payment_receipt` subido), `unregister_payment_receipt` (revertir antes de verificación), `verify_payment` (operador). Páginas `/agency/payments` y `/operator/payments` con saldos agrupados por contraparte (USD y ARS separados) + detalle con BspBadge. Paneles `PaymentPanel` (agencia: subir comprobantes + confirmar pago) y `PaymentVerifyPanel` (operador: ver comprobantes + verificar). Helpers `lib/payments.ts` con `paymentStage` (pending_receipt | pending_verification | verified) + tonos.

### Iteración 12 — Mail transaccional (Resend)
Helpers `lib/mail/send.ts` (`sendMailSafe` que nunca rompe el flow), `lib/mail/templates.ts` (HTML simple inline), `lib/mail/recipients.ts` (lookup vía RPCs `agency_member_emails` / `operator_member_emails`, ambas security definer y validan el caller). Migration `member_emails` agrega esas RPCs. Hooks post-success en server actions: invitación operator_link, dispatch a operadores, quote enviada (notif a agencia), quote aceptada / parcial (notif al operador), comprobante de pago confirmado (notif al operador), pago verificado (notif a agencia), resumen de viaje al cliente (mail directo a la dirección del cliente). Env vars `RESEND_API_KEY`, `RESEND_FROM_EMAIL=notificaciones@didigitalstudio.com`, `NEXT_PUBLIC_APP_URL`.

### Iteración 13 — PDF presupuesto al cliente
Instala `@react-pdf/renderer` (runtime `nodejs` obligatorio). Componente `lib/pdf/quote-pdf.tsx` con branding (color, logo) por agencia, ítems, subtotal/margen/total, validez, condiciones de pago. Route handler `/agency/requests/[id]/pdf?quote_id=X&margin=Y&margin_type=fixed|percent` devuelve `application/pdf` inline. Margen pasado por query string (no persistido, no visible al operador). UI: en cada `QuoteCard` hay un colapsable con input de margen + selector % / monto fijo y botón que abre el PDF en nueva pestaña.

### Iteración 14 — Bot de Telegram (grammY)
Bot [@traveld_bot](https://t.me/traveld_bot). Migración `telegram_integration`: tablas `telegram_links` (PK user_id), `telegram_link_codes`. RPCs security definer: `generate_telegram_link_code` (auth), `consume_telegram_link_code(code, chat_id, username)` (anon), `telegram_create_request(chat_id, client_name, destination, notes)` (anon, valida link + resuelve agencia + genera `TD-NNNN`), `telegram_list_recent_requests`. Route handler POST `/api/telegram/webhook` (runtime nodejs) con grammY en modo webhook. Setup en `/api/telegram/setup?secret=…`. Webhook secret: `TELEGRAM_WEBHOOK_SECRET` (cabezal `X-Telegram-Bot-Api-Secret-Token`). Página `/agency/telegram` para generar el code de vinculación y desvincular. Comandos: `/start`, `/help`, `/vincular CODE`, `/cotizar Cliente ; Destino ; Notas`, `/listar`. Toda la lógica usa el cliente anónimo de Supabase — sin service_role en producción.

### Iteración 15 — Resumen de viaje al cliente final
Migración `client_summary` agrega `quote_requests.client_summary_token uuid` (unique parcial). RPCs `generate_client_summary_token` (idempotente), `revoke_client_summary_token`, `get_trip_summary(token)` (granted to anon, devuelve jsonb con request + agency branding + reservation + passengers). Página pública `/trip/[token]` con branding (color, logo) — itinerario, fechas, pasajeros, reserva, notas. Panel `ClientSummaryPanel` en el expediente: generar/revocar link, copiar, abrir, enviar por mail (template `clientTripSummaryEmail` vía Resend, recipient definible).

### Iteración 16 — CRM básico
Migración `clients`. Tabla `clients` por agencia (full_name, email citext, phone, document_type, document_number, birth_date, address, notes) + RLS por `agency_id`. FK opcional `quote_requests.client_id` (snapshots de `client_name/email/phone` se mantienen). RPCs `upsert_client`, `delete_client`. `create_quote_request` y `update_quote_request` extendidas con `p_client_id`; el overload viejo se drop en `drop_old_update_quote_request`. UI: listado `/agency/clients`, alta `/agency/clients/new`, ficha `/agency/clients/[id]` (edit + delete + historial de viajes + link "Nueva solicitud para este cliente"). Combobox `ClientPicker` integrado al `request-form.tsx` (campos cliente ahora controlados; busca por nombre o email; clic autocompleta). Soporta preset via `/agency/requests/new?client_id=X`.

### Iteración 17 — Google Drive integration
Migración `google_drive`. Tablas `agency_google_drive_connections` (PK agency_id; admin-only) + `attachment_drive_files` (track de qué se sincronizó). OAuth con scope `drive.file`. Endpoints: `/api/google/start` (inicia flow con state=agency_id|user_id), `/api/google/callback` (intercambia code → refresh_token, ensure folder "TravelDesk", upsert connection). RPCs `upsert_agency_drive_connection`, `set_agency_drive_folder`, `get_agency_drive_refresh_token`, `register_drive_sync`. `lib/google/drive.ts` con helpers (auth client, ensureFolder, uploadStream). `lib/google/sync.ts` implementa el sync per-request: crea carpeta `<client> · <code>`, sub-carpetas por kind, descarga vía signed URLs y sube vía `drive.files.create` con stream. UI: página `/agency/integrations` (conectar/desconectar) + botón `DriveSyncButton` en el header del expediente cuando la conexión existe (best-effort, no bloquea).

### Iteración 18 — Notificaciones in-app + dashboards
Migración `notifications`. Tabla `notifications` (`user_id`, `kind`, `title`, `body`, `link`, `read_at`). RPCs `notify_agency_members` / `notify_operator_members` (security definer, validan que el caller esté relacionado con el tenant destino), `mark_notification_read`, `mark_all_notifications_read`. Hooks integrados en los mismos puntos que los mails (un mail + una notification). Componente `NotificationsBell` (campana con contador, dropdown con últimas 12, link a la entidad relacionada, "marcar todas leídas") montado en ambos layouts. Dashboards `/agency` y `/operator` rehechos: stats (activas, a pagar, verificados, clientes, tasa de aceptación), barra de últimos 6 meses, breakdown por status, próximos vencimientos BSP, últimas solicitudes.

## Estado: iteraciones pendientes
Ninguna mayor. Roadmap futuro abierto: integración con Resend webhooks (delivered/bounced), email templating con `react-email`, multi-payment (anticipo + saldo), Drive auto-mirror on upload (en lugar de manual), conversation state real para Telegram (multi-step), notificaciones push web (FCM).

## Decisiones arquitectónicas tomadas

- **Memberships en 2 tablas (no 1 polimórfica):** FK directas, RLS más limpia, cada lado puede crecer con columnas propias. Un mismo email puede ser admin de una agencia y member de un operador sin choque.
- **Slug con sufijo random:** `slugify(name) + random4chars` para evitar colisiones sin pedir input al user.
- **`code` por agencia:** `TD-NNNN` con counter en `agencies.request_count`. Update + RETURNING garantiza secuencialidad sin race.
- **`accept_invitation(operator_link)`** exige que el invitado YA tenga un operador donde sea admin. Si llega un user nuevo, primero pasa por onboarding (crea operador) y después acepta.
- **RLS para operador:** ve la solicitud sólo si existe un dispatch a él (`is_operator_dispatched_to_request`). No tiene acceso a otras solicitudes de la agencia.
- **Mails best-effort, never block:** `sendMailSafe` y los `notify*` están dentro de try/catch — si Resend falla o el RPC `notify_*_members` rompe, el action principal igual responde OK. Trade-off: el usuario puede ver "OK" sin que llegue el mail. Aceptable para MVP.
- **Telegram sin service_role:** todas las RPCs callable desde el webhook son `security definer` y validan `chat_id` linkeado. Mantiene la deploy sin necesitar la key sensible (la que se agregó a Vercel production como respaldo se puede borrar si no se usa para nada más).
- **PDF con margen no persistido:** el margen va por query string (`?margin=X&margin_type=fixed|percent`), no se guarda en DB. El operador nunca lo ve porque no tiene acceso al endpoint `/agency/...`.
- **Tabla única `attachments`**: un kind enum (`passenger_doc | reservation | voucher | invoice | file_doc | payment_receipt`) con FK a `quote_request_id`. Decisión: no abrir tabla por tipo. Los `payment_receipt` los sube la agencia (con `operator_id null`).

## Cosas a tener cuidado

- **El warning Next 16** "middleware → proxy" todavía no lo migré. Cuando se haga, renombrar `middleware.ts` a `proxy.ts` y actualizar el matcher en `config`.
- **`request_count`** en agencias se incrementa incluso si después se cancela la solicitud (códigos pueden tener gaps). Aceptable.
- **`gen_random_uuid()`** funciona porque está en el search_path de Supabase. **`gen_random_bytes()` NO** (no está en el search_path para roles auth). Para tokens random, concatenar dos UUIDs sin guiones.
- **Service role key** está en `.env.local` (gitignored). NO commitearla. Iter 14 NO la necesita (todas las RPCs son security definer). Está agregada a Vercel production como respaldo — borrar si no se usa.
- **`supabase gen types`** mete el banner "new version available" en stderr. Siempre redirigir stderr a `/dev/null` o el archivo de tipos queda corrupto: `supabase gen types typescript ... 2>/dev/null > types/supabase.ts`.
- **Webhook Telegram setup**: hay que correr GET `/api/telegram/setup?secret=$TELEGRAM_WEBHOOK_SECRET` una vez después del primer deploy a un dominio nuevo. Idem si se rota el secret.
- **OAuth Google redirect URI**: las URIs autorizadas tienen que estar en Google Cloud Console del proyecto. Configuradas: `https://traveldesk-two.vercel.app/api/google/callback` y `http://localhost:3000/api/google/callback`. Si cambia el dominio, agregar la nueva.
- El user `aguducculi@gmail.com` con la "Agencia Demo" original (creada en iter 2) sigue activo y es independiente de las cuentas demo públicas. No tocarlo a menos que el usuario lo pida.
