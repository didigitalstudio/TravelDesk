-- TravelDesk — Iteración 7: pasajeros + documentación + bucket de attachments

-- ============================================================================
-- Enums
-- ============================================================================
create type public.passenger_type as enum ('adult', 'child', 'infant');

create type public.attachment_kind as enum (
  'passenger_doc',
  'reservation',
  'voucher',
  'invoice',
  'file_doc',
  'payment_receipt'
);

-- ============================================================================
-- passengers: cargados por la agencia, asociados a una quote_request
-- ============================================================================
create table public.passengers (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  full_name text not null,
  passenger_type public.passenger_type not null default 'adult',
  document_type text,
  document_number text,
  birth_date date,
  email citext,
  phone text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_passengers_updated_at
before update on public.passengers
for each row execute function public.set_updated_at();

create index passengers_request_idx on public.passengers(quote_request_id);
create index passengers_agency_idx on public.passengers(agency_id);

-- ============================================================================
-- attachments: tabla genérica para todos los archivos del expediente
-- ============================================================================
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  kind public.attachment_kind not null,
  -- Para passenger_doc: el pasajero al que pertenece
  passenger_id uuid references public.passengers(id) on delete cascade,
  -- Para attachments subidos por un operador (reservation, voucher, etc.)
  operator_id uuid references public.operators(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (storage_path)
);

create index attachments_request_kind_idx
  on public.attachments(quote_request_id, kind);
create index attachments_passenger_idx
  on public.attachments(passenger_id) where passenger_id is not null;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.passengers enable row level security;
alter table public.attachments enable row level security;

create policy "pax_select_agency"
on public.passengers for select
using (public.is_agency_member(agency_id));

create policy "pax_select_operator_dispatched"
on public.passengers for select
using (public.is_operator_dispatched_to_request(quote_request_id));

create policy "pax_modify_agency"
on public.passengers for all
using (public.is_agency_member(agency_id))
with check (public.is_agency_member(agency_id));

-- attachments visible para ambos lados; el operador solo si está despachado
create policy "att_select_agency"
on public.attachments for select
using (public.is_agency_member(agency_id));

create policy "att_select_operator_dispatched"
on public.attachments for select
using (public.is_operator_dispatched_to_request(quote_request_id));

-- Inserciones: agencia para passenger_doc; operador despachado para los suyos
create policy "att_insert_agency"
on public.attachments for insert
with check (
  public.is_agency_member(agency_id)
  and operator_id is null
);

create policy "att_insert_operator"
on public.attachments for insert
with check (
  operator_id is not null
  and public.is_operator_member(operator_id)
  and public.is_operator_dispatched_to_request(quote_request_id)
);

-- Borrado: cada lado borra lo suyo
create policy "att_delete_agency"
on public.attachments for delete
using (public.is_agency_member(agency_id) and operator_id is null);

create policy "att_delete_operator"
on public.attachments for delete
using (
  operator_id is not null
  and public.is_operator_member(operator_id)
);

-- ============================================================================
-- Storage bucket
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Storage RLS policies. Path convention:
--   {agency_id}/{quote_request_id}/...
-- (storage.foldername extrae array de carpetas; folder[1] = agency_id)
create policy "storage_attachments_select_agency"
on storage.objects for select
using (
  bucket_id = 'attachments'
  and public.is_agency_member(((storage.foldername(name))[1])::uuid)
);

create policy "storage_attachments_select_operator"
on storage.objects for select
using (
  bucket_id = 'attachments'
  and public.is_operator_dispatched_to_request(
    ((storage.foldername(name))[2])::uuid
  )
);

create policy "storage_attachments_insert_agency"
on storage.objects for insert
with check (
  bucket_id = 'attachments'
  and public.is_agency_member(((storage.foldername(name))[1])::uuid)
);

create policy "storage_attachments_insert_operator"
on storage.objects for insert
with check (
  bucket_id = 'attachments'
  and public.is_operator_dispatched_to_request(
    ((storage.foldername(name))[2])::uuid
  )
);

create policy "storage_attachments_delete_agency"
on storage.objects for delete
using (
  bucket_id = 'attachments'
  and public.is_agency_member(((storage.foldername(name))[1])::uuid)
);

create policy "storage_attachments_delete_operator"
on storage.objects for delete
using (
  bucket_id = 'attachments'
  and public.is_operator_dispatched_to_request(
    ((storage.foldername(name))[2])::uuid
  )
);

-- ============================================================================
-- RPCs
-- ============================================================================

-- upsert_passenger: si p_id es null, crea; si no, edita.
create or replace function public.upsert_passenger(
  p_request_id uuid,
  p_full_name text,
  p_passenger_type public.passenger_type,
  p_document_type text default null,
  p_document_number text default null,
  p_birth_date date default null,
  p_email citext default null,
  p_phone text default null,
  p_notes text default null,
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
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

  select agency_id into v_agency_id from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;

  if p_id is null then
    insert into public.passengers (
      quote_request_id, agency_id, full_name, passenger_type,
      document_type, document_number, birth_date, email, phone, notes, created_by
    ) values (
      p_request_id, v_agency_id, trim(p_full_name), coalesce(p_passenger_type, 'adult'),
      nullif(trim(p_document_type), ''), nullif(trim(p_document_number), ''),
      p_birth_date, p_email, nullif(trim(p_phone), ''), nullif(trim(p_notes), ''), v_uid
    )
    returning id into v_id;
  else
    update public.passengers set
      full_name = trim(p_full_name),
      passenger_type = coalesce(p_passenger_type, passenger_type),
      document_type = nullif(trim(p_document_type), ''),
      document_number = nullif(trim(p_document_number), ''),
      birth_date = p_birth_date,
      email = p_email,
      phone = nullif(trim(p_phone), ''),
      notes = nullif(trim(p_notes), '')
    where id = p_id and quote_request_id = p_request_id
    returning id into v_id;
    if v_id is null then raise exception 'passenger not found'; end if;
  end if;

  return v_id;
end;
$$;

grant execute on function public.upsert_passenger(
  uuid, text, public.passenger_type, text, text, date, citext, text, text, uuid
) to authenticated;

create or replace function public.delete_passenger(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select agency_id into v_agency_id from public.passengers where id = p_id;
  if not found then return; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  delete from public.passengers where id = p_id;
end;
$$;

grant execute on function public.delete_passenger(uuid) to authenticated;

-- register_attachment: registra metadata después de subir el archivo al bucket
create or replace function public.register_attachment(
  p_request_id uuid,
  p_kind public.attachment_kind,
  p_storage_path text,
  p_file_name text,
  p_mime_type text default null,
  p_size_bytes bigint default null,
  p_passenger_id uuid default null,
  p_operator_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select agency_id into v_agency_id from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;

  -- Lado agencia (operator_id null) o lado operador (operator_id set y miembro)
  if p_operator_id is null then
    if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  else
    if not public.is_operator_member(p_operator_id) then
      raise exception 'forbidden: not member of operator';
    end if;
    if not public.is_operator_dispatched_to_request(p_request_id) then
      raise exception 'forbidden: operator not dispatched';
    end if;
  end if;

  insert into public.attachments (
    quote_request_id, agency_id, kind, passenger_id, operator_id,
    storage_path, file_name, mime_type, size_bytes, uploaded_by
  ) values (
    p_request_id, v_agency_id, p_kind, p_passenger_id, p_operator_id,
    p_storage_path, p_file_name, p_mime_type, p_size_bytes, v_uid
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.register_attachment(
  uuid, public.attachment_kind, text, text, text, bigint, uuid, uuid
) to authenticated;

create or replace function public.delete_attachment(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_operator_id uuid;
  v_path text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select agency_id, operator_id, storage_path
    into v_agency_id, v_operator_id, v_path
  from public.attachments where id = p_id;
  if not found then return null; end if;

  if v_operator_id is null then
    if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  else
    if not public.is_operator_member(v_operator_id) then raise exception 'forbidden'; end if;
  end if;

  delete from public.attachments where id = p_id;
  return v_path;
end;
$$;

grant execute on function public.delete_attachment(uuid) to authenticated;
