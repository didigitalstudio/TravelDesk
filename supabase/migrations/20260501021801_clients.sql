-- TravelDesk — Iteración 16: CRM básico (clientes)
-- Tabla de clientes por agencia, con FK opcional desde quote_requests.
-- Los datos snapshot (client_name/email/phone) en quote_requests siguen vigentes
-- para preservar los presupuestos históricos sin que cambios en el cliente los muten.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  full_name text not null,
  email citext,
  phone text,
  document_type text,
  document_number text,
  birth_date date,
  address text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create index clients_agency_idx on public.clients(agency_id);
create index clients_agency_name_idx on public.clients(agency_id, full_name);

alter table public.clients enable row level security;

create policy "clients_select_agency"
  on public.clients for select using (public.is_agency_member(agency_id));

create policy "clients_modify_agency"
  on public.clients for all
  using (public.is_agency_member(agency_id))
  with check (public.is_agency_member(agency_id));

-- ============================================================================
-- FK opcional desde quote_requests
-- ============================================================================
alter table public.quote_requests
  add column client_id uuid references public.clients(id) on delete set null;

create index quote_requests_client_idx
  on public.quote_requests(client_id) where client_id is not null;

-- ============================================================================
-- RPCs
-- ============================================================================

create or replace function public.upsert_client(
  p_full_name text,
  p_email citext default null,
  p_phone text default null,
  p_document_type text default null,
  p_document_number text default null,
  p_birth_date date default null,
  p_address text default null,
  p_notes text default null,
  p_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'full_name is required';
  end if;

  if p_id is null then
    select agency_id into v_agency_id
    from public.agency_members where user_id = v_uid limit 1;
    if v_agency_id is null then raise exception 'user not in any agency'; end if;

    insert into public.clients (
      agency_id, full_name, email, phone, document_type, document_number,
      birth_date, address, notes, created_by
    ) values (
      v_agency_id, trim(p_full_name), p_email, nullif(trim(p_phone), ''),
      nullif(trim(p_document_type), ''), nullif(trim(p_document_number), ''),
      p_birth_date, nullif(trim(p_address), ''), nullif(trim(p_notes), ''), v_uid
    ) returning id into v_id;
  else
    select agency_id into v_agency_id from public.clients where id = p_id;
    if not found then raise exception 'client not found'; end if;
    if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;

    update public.clients set
      full_name = trim(p_full_name),
      email = p_email,
      phone = nullif(trim(p_phone), ''),
      document_type = nullif(trim(p_document_type), ''),
      document_number = nullif(trim(p_document_number), ''),
      birth_date = p_birth_date,
      address = nullif(trim(p_address), ''),
      notes = nullif(trim(p_notes), '')
    where id = p_id returning id into v_id;
  end if;
  return v_id;
end;
$$;

grant execute on function public.upsert_client(
  text, citext, text, text, text, date, text, text, uuid
) to authenticated;

create or replace function public.delete_client(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_agency_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select agency_id into v_agency_id from public.clients where id = p_id;
  if not found then return; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  delete from public.clients where id = p_id;
end;
$$;

grant execute on function public.delete_client(uuid) to authenticated;

-- ============================================================================
-- Extender create_quote_request y update_quote_request con p_client_id opcional.
-- ============================================================================

drop function if exists public.create_quote_request(
  uuid, text, text, integer, integer, integer, public.service_type[], citext, text, date, date, boolean, text
);

create or replace function public.create_quote_request(
  p_agency_id uuid,
  p_client_name text,
  p_destination text,
  p_pax_adults integer default 1,
  p_pax_children integer default 0,
  p_pax_infants integer default 0,
  p_services public.service_type[] default '{}'::service_type[],
  p_client_email citext default null,
  p_client_phone text default null,
  p_departure_date date default null,
  p_return_date date default null,
  p_flexible_dates boolean default false,
  p_notes text default null,
  p_client_id uuid default null
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
  v_client_agency uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.is_agency_member(p_agency_id) then
    raise exception 'forbidden: not a member of this agency';
  end if;

  if p_client_id is not null then
    select agency_id into v_client_agency from public.clients where id = p_client_id;
    if v_client_agency is null or v_client_agency <> p_agency_id then
      raise exception 'client does not belong to this agency';
    end if;
  end if;

  update public.agencies
    set request_count = request_count + 1
    where id = p_agency_id
    returning request_count into v_seq;

  v_code := 'TD-' || lpad(v_seq::text, 4, '0');

  insert into public.quote_requests (
    agency_id, code, status, client_id, client_name, client_email, client_phone,
    destination, departure_date, return_date, flexible_dates,
    pax_adults, pax_children, pax_infants, services, notes, created_by
  ) values (
    p_agency_id, v_code, 'draft', p_client_id, p_client_name, p_client_email, p_client_phone,
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

grant execute on function public.create_quote_request(
  uuid, text, text, integer, integer, integer, public.service_type[], citext, text, date, date, boolean, text, uuid
) to authenticated;

drop function if exists public.update_quote_request(
  uuid, text, citext, text, text, date, date, boolean, integer, integer, integer, public.service_type[], text
);

create or replace function public.update_quote_request(
  p_request_id uuid,
  p_client_name text,
  p_destination text,
  p_pax_adults integer default 1,
  p_pax_children integer default 0,
  p_pax_infants integer default 0,
  p_services public.service_type[] default '{}'::service_type[],
  p_client_email citext default null,
  p_client_phone text default null,
  p_departure_date date default null,
  p_return_date date default null,
  p_flexible_dates boolean default false,
  p_notes text default null,
  p_client_id uuid default null
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
  v_client_agency uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select agency_id, status into v_agency_id, v_status
  from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_status not in ('draft', 'sent') then
    raise exception 'request cannot be edited in status %', v_status;
  end if;

  if p_client_id is not null then
    select agency_id into v_client_agency from public.clients where id = p_client_id;
    if v_client_agency is null or v_client_agency <> v_agency_id then
      raise exception 'client does not belong to this agency';
    end if;
  end if;

  update public.quote_requests set
    client_id = p_client_id,
    client_name = p_client_name,
    client_email = p_client_email,
    client_phone = p_client_phone,
    destination = p_destination,
    departure_date = p_departure_date,
    return_date = p_return_date,
    flexible_dates = coalesce(p_flexible_dates, false),
    pax_adults = coalesce(p_pax_adults, 1),
    pax_children = coalesce(p_pax_children, 0),
    pax_infants = coalesce(p_pax_infants, 0),
    services = coalesce(p_services, '{}'::service_type[]),
    notes = p_notes
  where id = p_request_id;
end;
$$;

grant execute on function public.update_quote_request(
  uuid, text, text, integer, integer, integer, public.service_type[], citext, text, date, date, boolean, text, uuid
) to authenticated;
