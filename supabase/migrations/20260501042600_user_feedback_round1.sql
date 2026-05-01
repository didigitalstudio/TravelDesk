-- TravelDesk — Feedback usuario tras testing tanda 1.
-- 1) Bug Telegram: agency_id ambiguous (RETURNS TABLE pisa column refs).
-- 2) Pasajeros y clientes ganan: document_expiry_date, nationality, city.
-- 3) get_trip_summary devuelve attachments del operador para que el cliente
--    final pueda descargarlos desde /trip/[token].

-- ============================================================================
-- 1) Telegram RPCs — qualify column refs para evitar ambigüedad con out params
-- ============================================================================
create or replace function public.telegram_create_request(
  p_chat_id bigint,
  p_client_name text,
  p_destination text,
  p_notes text default null
)
returns table (request_id uuid, request_code text, agency_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_agency_id uuid;
  v_seq integer;
  v_code text;
  v_id uuid;
begin
  select tl.user_id into v_user_id
  from public.telegram_links tl where tl.chat_id = p_chat_id;
  if v_user_id is null then
    raise exception 'chat not linked';
  end if;

  select am.agency_id into v_agency_id
  from public.agency_members am where am.user_id = v_user_id limit 1;
  if v_agency_id is null then
    raise exception 'user has no agency';
  end if;

  if p_client_name is null or length(trim(p_client_name)) = 0 then
    raise exception 'client_name required';
  end if;
  if p_destination is null or length(trim(p_destination)) = 0 then
    raise exception 'destination required';
  end if;

  update public.agencies a
    set request_count = a.request_count + 1
    where a.id = v_agency_id
    returning a.request_count into v_seq;

  v_code := 'TD-' || lpad(v_seq::text, 4, '0');

  insert into public.quote_requests (
    agency_id, code, status, client_name, destination, notes, created_by
  ) values (
    v_agency_id, v_code, 'draft', trim(p_client_name), trim(p_destination),
    nullif(trim(p_notes), ''), v_user_id
  )
  returning id into v_id;

  insert into public.quote_request_status_history (quote_request_id, from_status, to_status, changed_by)
  values (v_id, null, 'draft', v_user_id);

  request_id := v_id;
  request_code := v_code;
  agency_id := v_agency_id;
  return next;
end;
$$;

create or replace function public.telegram_list_recent_requests(p_chat_id bigint, p_limit integer default 5)
returns table (
  request_id uuid,
  request_code text,
  client_name text,
  destination text,
  status public.request_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_agency_id uuid;
begin
  select tl.user_id into v_user_id
  from public.telegram_links tl where tl.chat_id = p_chat_id;
  if v_user_id is null then return; end if;
  select am.agency_id into v_agency_id
  from public.agency_members am where am.user_id = v_user_id limit 1;
  if v_agency_id is null then return; end if;

  return query
  select r.id, r.code, r.client_name, r.destination, r.status, r.created_at
  from public.quote_requests r
  where r.agency_id = v_agency_id
  order by r.created_at desc
  limit greatest(1, least(p_limit, 20));
end;
$$;

-- ============================================================================
-- 2) Nuevos campos en clients y passengers
-- ============================================================================
alter table public.clients
  add column if not exists document_expiry_date date,
  add column if not exists nationality text,
  add column if not exists city text;

alter table public.passengers
  add column if not exists document_expiry_date date,
  add column if not exists nationality text,
  add column if not exists city text;

-- Drop signatures viejas para recrear con los nuevos params
drop function if exists public.upsert_client(
  text, citext, text, text, text, date, text, text, uuid
);
drop function if exists public.upsert_passenger(
  uuid, text, public.passenger_type, text, text, date, citext, text, text, uuid
);

create or replace function public.upsert_client(
  p_full_name text,
  p_email citext default null,
  p_phone text default null,
  p_document_type text default null,
  p_document_number text default null,
  p_birth_date date default null,
  p_address text default null,
  p_notes text default null,
  p_id uuid default null,
  p_document_expiry_date date default null,
  p_nationality text default null,
  p_city text default null
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
    select am.agency_id into v_agency_id
    from public.agency_members am where am.user_id = v_uid limit 1;
    if v_agency_id is null then raise exception 'user not in any agency'; end if;

    insert into public.clients (
      agency_id, full_name, email, phone, document_type, document_number,
      birth_date, address, notes, created_by,
      document_expiry_date, nationality, city
    ) values (
      v_agency_id, trim(p_full_name), p_email, nullif(trim(p_phone), ''),
      nullif(trim(p_document_type), ''), nullif(trim(p_document_number), ''),
      p_birth_date, nullif(trim(p_address), ''), nullif(trim(p_notes), ''), v_uid,
      p_document_expiry_date, nullif(trim(p_nationality), ''), nullif(trim(p_city), '')
    ) returning id into v_id;
  else
    select c.agency_id into v_agency_id from public.clients c where c.id = p_id;
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
      notes = nullif(trim(p_notes), ''),
      document_expiry_date = p_document_expiry_date,
      nationality = nullif(trim(p_nationality), ''),
      city = nullif(trim(p_city), '')
    where id = p_id returning id into v_id;
  end if;
  return v_id;
end;
$$;

grant execute on function public.upsert_client(
  text, citext, text, text, text, date, text, text, uuid, date, text, text
) to authenticated;

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
  p_id uuid default null,
  p_document_expiry_date date default null,
  p_nationality text default null,
  p_city text default null
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
      document_type, document_number, birth_date, email, phone, notes, created_by,
      document_expiry_date, nationality, city
    ) values (
      p_request_id, v_agency_id, trim(p_full_name), coalesce(p_passenger_type, 'adult'),
      nullif(trim(p_document_type), ''), nullif(trim(p_document_number), ''),
      p_birth_date, p_email, nullif(trim(p_phone), ''), nullif(trim(p_notes), ''), v_uid,
      p_document_expiry_date, nullif(trim(p_nationality), ''), nullif(trim(p_city), '')
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
      notes = nullif(trim(p_notes), ''),
      document_expiry_date = p_document_expiry_date,
      nationality = nullif(trim(p_nationality), ''),
      city = nullif(trim(p_city), '')
    where id = p_id and quote_request_id = p_request_id
    returning id into v_id;
    if v_id is null then raise exception 'passenger not found'; end if;
  end if;

  return v_id;
end;
$$;

grant execute on function public.upsert_passenger(
  uuid, text, public.passenger_type, text, text, date, citext, text, text, uuid, date, text, text
) to authenticated;

-- ============================================================================
-- 3) get_trip_summary devuelve attachments del operador (los que tiene sentido
--    compartir con el cliente final): voucher, invoice, file_doc, reservation.
--    No expone passenger_doc ni payment_receipt.
-- ============================================================================
create or replace function public.get_trip_summary(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'request', jsonb_build_object(
      'code', r.code,
      'client_name', r.client_name,
      'destination', r.destination,
      'departure_date', r.departure_date,
      'return_date', r.return_date,
      'flexible_dates', r.flexible_dates,
      'pax_adults', r.pax_adults,
      'pax_children', r.pax_children,
      'pax_infants', r.pax_infants,
      'services', r.services,
      'status', r.status,
      'issued_at', r.issued_at,
      'created_at', r.created_at
    ),
    'agency', jsonb_build_object(
      'name', a.name,
      'brand_color', a.brand_color,
      'brand_logo_url', a.brand_logo_url
    ),
    'reservation', case when res.id is null then null else jsonb_build_object(
      'reservation_code', res.reservation_code,
      'operator_name', op.name
    ) end,
    'passengers', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'full_name', p.full_name,
          'passenger_type', p.passenger_type,
          'nationality', p.nationality
        ) order by p.created_at
      )
      from public.passengers p where p.quote_request_id = r.id),
      '[]'::jsonb
    ),
    'documents', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'id', a2.id,
          'file_name', a2.file_name,
          'kind', a2.kind,
          'size_bytes', a2.size_bytes
        ) order by a2.created_at desc
      )
      from public.attachments a2
      where a2.quote_request_id = r.id
        and a2.kind in ('voucher', 'invoice', 'file_doc', 'reservation')),
      '[]'::jsonb
    )
  )
  from public.quote_requests r
  join public.agencies a on a.id = r.agency_id
  left join public.reservations res on res.quote_request_id = r.id
  left join public.operators op on op.id = res.operator_id
  where r.client_summary_token = p_token;
$$;

-- ============================================================================
-- 3 cont) RPC para resolver storage_path de un attachment a partir del token
-- público. Solo permite kinds compartibles. Devuelve el path para que el caller
-- (route handler) genere una signed URL fresca.
-- ============================================================================
create or replace function public.get_trip_attachment_path(
  p_token uuid,
  p_attachment_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a2.storage_path
  from public.attachments a2
  join public.quote_requests r on r.id = a2.quote_request_id
  where r.client_summary_token = p_token
    and a2.id = p_attachment_id
    and a2.kind in ('voucher', 'invoice', 'file_doc', 'reservation')
  limit 1;
$$;

grant execute on function public.get_trip_attachment_path(uuid, uuid) to anon, authenticated;

-- ============================================================================
-- Storage policies: permitir lectura anónima de payload via signed URL.
-- Las signed URLs ya bypassean RLS de storage por design. No hace falta tocar
-- las policies — get_trip_attachment_path corre security definer y devuelve
-- el path; el route handler lo usa con service-side createSignedUrl.
-- ============================================================================
