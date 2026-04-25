-- TravelDesk — Iteración 4: solicitudes de cotización
-- Modela el expediente principal: una agencia carga una solicitud, la despacha
-- a uno o varios operadores vinculados, y se registra historial de estados.

-- ============================================================================
-- Enums
-- ============================================================================
create type public.request_status as enum (
  'draft',
  'sent',
  'quoted',
  'partially_accepted',
  'accepted',
  'reserved',
  'docs_uploaded',
  'issued',
  'payment_pending',
  'closed',
  'cancelled'
);

create type public.service_type as enum (
  'flights',
  'hotel',
  'transfers',
  'excursions',
  'package',
  'cruise',
  'insurance',
  'other'
);

-- ============================================================================
-- Counter por agencia para generar código humano (TD-{seq})
-- ============================================================================
alter table public.agencies add column request_count integer not null default 0;

-- ============================================================================
-- quote_requests: la solicitud principal
-- ============================================================================
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  code text not null,
  status public.request_status not null default 'draft',
  -- Cliente final (texto libre por ahora; fase 2 link a tabla clients)
  client_name text not null,
  client_email citext,
  client_phone text,
  -- Datos del viaje
  destination text not null,
  departure_date date,
  return_date date,
  flexible_dates boolean not null default false,
  pax_adults integer not null default 1 check (pax_adults >= 0),
  pax_children integer not null default 0 check (pax_children >= 0),
  pax_infants integer not null default 0 check (pax_infants >= 0),
  services public.service_type[] not null default '{}',
  notes text,
  -- Metadata
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, code)
);

create trigger trg_quote_requests_updated_at
before update on public.quote_requests
for each row execute function public.set_updated_at();

create index quote_requests_agency_status_idx
  on public.quote_requests(agency_id, status, created_at desc);

-- ============================================================================
-- quote_request_dispatches: a qué operadores se envió cada solicitud
-- ============================================================================
create table public.quote_request_dispatches (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (quote_request_id, operator_id)
);

create index dispatches_request_idx
  on public.quote_request_dispatches(quote_request_id);
create index dispatches_operator_idx
  on public.quote_request_dispatches(operator_id, sent_at desc);

-- ============================================================================
-- quote_request_status_history: audit trail de cambios de estado
-- ============================================================================
create table public.quote_request_status_history (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  from_status public.request_status,
  to_status public.request_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  notes text
);

create index status_history_request_idx
  on public.quote_request_status_history(quote_request_id, changed_at desc);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.quote_requests              enable row level security;
alter table public.quote_request_dispatches    enable row level security;
alter table public.quote_request_status_history enable row level security;

-- Helper: ¿el user actual es operador miembro al cual se le despachó esta request?
create or replace function public.is_operator_dispatched_to_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quote_request_dispatches d
    join public.operator_members om on om.operator_id = d.operator_id
    where d.quote_request_id = p_request_id
      and om.user_id = auth.uid()
  );
$$;

-- quote_requests
create policy "qr_select_agency_member"
on public.quote_requests for select
using (public.is_agency_member(agency_id));

create policy "qr_select_dispatched_operator"
on public.quote_requests for select
using (public.is_operator_dispatched_to_request(id));

create policy "qr_modify_agency_member"
on public.quote_requests for all
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

-- quote_request_dispatches
create policy "qrd_select_either_side"
on public.quote_request_dispatches for select
using (
  exists (
    select 1 from public.quote_requests r
    where r.id = quote_request_dispatches.quote_request_id
      and public.is_agency_member(r.agency_id)
  )
  or public.is_operator_member(operator_id)
);

create policy "qrd_insert_agency_member"
on public.quote_request_dispatches for insert
with check (
  exists (
    select 1 from public.quote_requests r
    where r.id = quote_request_dispatches.quote_request_id
      and public.is_agency_member(r.agency_id)
  )
);

create policy "qrd_delete_agency_member"
on public.quote_request_dispatches for delete
using (
  exists (
    select 1 from public.quote_requests r
    where r.id = quote_request_dispatches.quote_request_id
      and public.is_agency_member(r.agency_id)
  )
);

-- quote_request_status_history (read-only desde fuera; escritura via RPC/triggers)
create policy "qrsh_select_either_side"
on public.quote_request_status_history for select
using (
  exists (
    select 1 from public.quote_requests r
    where r.id = quote_request_status_history.quote_request_id
      and (public.is_agency_member(r.agency_id)
           or public.is_operator_dispatched_to_request(r.id))
  )
);

-- ============================================================================
-- RPCs
-- ============================================================================

-- create_quote_request: crea una solicitud en estado draft.
-- Genera code automáticamente: TD-{0001} por agencia, padded a 4.
create or replace function public.create_quote_request(
  p_agency_id uuid,
  p_client_name text,
  p_client_email citext,
  p_client_phone text,
  p_destination text,
  p_departure_date date,
  p_return_date date,
  p_flexible_dates boolean,
  p_pax_adults integer,
  p_pax_children integer,
  p_pax_infants integer,
  p_services public.service_type[],
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_seq integer;
  v_code text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_agency_member(p_agency_id) then
    raise exception 'forbidden: not a member of this agency';
  end if;

  update public.agencies
    set request_count = request_count + 1
    where id = p_agency_id
    returning request_count into v_seq;

  v_code := 'TD-' || lpad(v_seq::text, 4, '0');

  insert into public.quote_requests (
    agency_id, code, status, client_name, client_email, client_phone,
    destination, departure_date, return_date, flexible_dates,
    pax_adults, pax_children, pax_infants, services, notes, created_by
  ) values (
    p_agency_id, v_code, 'draft', p_client_name, p_client_email, p_client_phone,
    p_destination, p_departure_date, p_return_date, coalesce(p_flexible_dates, false),
    coalesce(p_pax_adults, 1), coalesce(p_pax_children, 0), coalesce(p_pax_infants, 0),
    coalesce(p_services, '{}'::service_type[]), p_notes, v_uid
  )
  returning id into v_id;

  insert into public.quote_request_status_history (quote_request_id, from_status, to_status, changed_by)
  values (v_id, null, 'draft', v_uid);

  return v_id;
end;
$$;

grant execute on function public.create_quote_request(uuid, text, citext, text, text, date, date, boolean, integer, integer, integer, public.service_type[], text) to authenticated;

-- send_quote_request: despacha la solicitud a uno o varios operadores vinculados.
-- Cambia el estado a 'sent'. Idempotente sobre dispatches (skip si ya existía).
create or replace function public.send_quote_request(
  p_request_id uuid,
  p_operator_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_status public.request_status;
  v_op uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_operator_ids is null or array_length(p_operator_ids, 1) is null then
    raise exception 'no operators selected';
  end if;

  select agency_id, status into v_agency_id, v_status
  from public.quote_requests where id = p_request_id;
  if not found then
    raise exception 'request not found';
  end if;
  if not public.is_agency_member(v_agency_id) then
    raise exception 'forbidden';
  end if;
  if v_status not in ('draft', 'sent') then
    raise exception 'request cannot be sent in status %', v_status;
  end if;

  -- Validar que TODOS los operadores estén vinculados a esta agencia
  if exists (
    select 1
    from unnest(p_operator_ids) as op(id)
    where not exists (
      select 1 from public.agency_operator_links l
      where l.agency_id = v_agency_id and l.operator_id = op.id
    )
  ) then
    raise exception 'one or more operators are not linked to this agency';
  end if;

  foreach v_op in array p_operator_ids loop
    insert into public.quote_request_dispatches (quote_request_id, operator_id)
    values (p_request_id, v_op)
    on conflict do nothing;
  end loop;

  if v_status = 'draft' then
    update public.quote_requests set status = 'sent' where id = p_request_id;
    insert into public.quote_request_status_history (quote_request_id, from_status, to_status, changed_by)
    values (p_request_id, 'draft', 'sent', v_uid);
  end if;
end;
$$;

grant execute on function public.send_quote_request(uuid, uuid[]) to authenticated;

-- cancel_quote_request
create or replace function public.cancel_quote_request(p_request_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_status public.request_status;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select agency_id, status into v_agency_id, v_status
  from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_status in ('cancelled', 'closed') then return; end if;

  update public.quote_requests set status = 'cancelled' where id = p_request_id;
  insert into public.quote_request_status_history (quote_request_id, from_status, to_status, changed_by, notes)
  values (p_request_id, v_status, 'cancelled', v_uid, p_notes);
end;
$$;

grant execute on function public.cancel_quote_request(uuid, text) to authenticated;
