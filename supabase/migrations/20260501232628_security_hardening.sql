-- TravelDesk — Endurecimiento post-review.
-- H5 + H6 + H8 + M1 + M5 + M6 + M7 + N5.

-- ============================================================================
-- H5 — Bucket de attachments con file_size_limit + allowed_mime_types.
-- Defense-in-depth: register_attachment también valida en SQL para mantener
-- el metadata consistente con el storage.
-- ============================================================================
update storage.buckets
set
  file_size_limit = 20971520, -- 20 MB
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
where id = 'attachments';

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
  v_max_bytes constant bigint := 20 * 1024 * 1024;
  v_allowed_mimes constant text[] := array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select agency_id into v_agency_id from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;

  if p_size_bytes is not null and p_size_bytes > v_max_bytes then
    raise exception 'file too large (max 20MB)';
  end if;
  if p_mime_type is not null and not (p_mime_type = any (v_allowed_mimes)) then
    raise exception 'mime type % not allowed', p_mime_type;
  end if;

  if p_operator_id is null then
    if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
    if p_kind in ('reservation', 'voucher', 'invoice', 'file_doc') then
      raise exception 'kind % no puede ser subido por la agencia', p_kind;
    end if;
  else
    if not public.is_operator_member(p_operator_id) then
      raise exception 'forbidden: not member of operator';
    end if;
    if not public.is_operator_dispatched_to_request(p_request_id) then
      raise exception 'forbidden: operator not dispatched';
    end if;
    if p_kind in ('passenger_doc', 'payment_receipt') then
      raise exception 'kind % no puede ser subido por el operador', p_kind;
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

-- ============================================================================
-- H6 — create_payment_on_issued ahora falla loud si no hay quote aceptada
-- o el total es 0. Antes era silent no-op y register_payment_receipt
-- después rompía con 'payment row not found'.
-- ============================================================================
alter table public.quote_items drop constraint if exists quote_items_amount_check;
alter table public.quote_items
  add constraint quote_items_amount_check check (amount > 0);

create or replace function public.create_payment_on_issued()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_amount numeric;
  v_currency public.currency;
  v_operator_id uuid;
begin
  if new.status = 'issued' and (old.status is distinct from 'issued') then
    select q.id, q.currency, q.operator_id,
           coalesce(sum(qi.amount) filter (where qi.accepted_at is not null), 0)
      into v_quote_id, v_currency, v_operator_id, v_amount
      from public.quotes q
      join public.quote_items qi on qi.quote_id = q.id
     where q.quote_request_id = new.id and q.status = 'accepted'
     group by q.id, q.currency, q.operator_id
     limit 1;

    if v_quote_id is null then
      raise exception 'cannot mark issued: no accepted quote found for request %', new.id;
    end if;
    if v_amount <= 0 then
      raise exception 'cannot mark issued: accepted total is %', v_amount;
    end if;

    insert into public.payments (quote_request_id, agency_id, operator_id, amount, currency, due_date)
    values (new.id, new.agency_id, v_operator_id, v_amount, v_currency, new.bsp_due_date)
    on conflict (quote_request_id) do nothing;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- H8 — Telegram input length checks + constraint en quote_requests.notes.
-- ============================================================================
alter table public.quote_requests drop constraint if exists quote_requests_notes_length;
alter table public.quote_requests
  add constraint quote_requests_notes_length
  check (notes is null or length(notes) <= 2000)
  not valid;

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
  if length(coalesce(p_client_name, '')) > 200 then
    raise exception 'client_name too long (max 200)';
  end if;
  if length(coalesce(p_destination, '')) > 200 then
    raise exception 'destination too long (max 200)';
  end if;
  if p_notes is not null and length(p_notes) > 2000 then
    raise exception 'notes too long (max 2000)';
  end if;

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

-- ============================================================================
-- M1 — brand_color: solo formato #RRGGBB. La validación en action es
-- defense-in-depth.
-- ============================================================================
alter table public.agencies drop constraint if exists agencies_brand_color_format;
alter table public.agencies
  add constraint agencies_brand_color_format
  check (brand_color is null or brand_color ~* '^#[0-9a-f]{6}$')
  not valid;

-- ============================================================================
-- M5 — submit_quote rechaza requests en accepted/reserved/issued/etc.
-- Solo permitido en sent/quoted/partially_accepted.
-- ============================================================================
create or replace function public.submit_quote(
  p_request_id uuid,
  p_total_amount numeric,
  p_currency public.currency,
  p_payment_terms text default null,
  p_valid_until date default null,
  p_notes text default null,
  p_exchange_rate_usd_ars numeric default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_operator_id uuid;
  v_request_status public.request_status;
  v_request_agency uuid;
  v_quote_id uuid;
  v_item jsonb;
  v_order integer := 0;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_total_amount is null or p_total_amount < 0 then
    raise exception 'invalid total amount';
  end if;

  select r.agency_id, r.status into v_request_agency, v_request_status
  from public.quote_requests r where r.id = p_request_id;
  if not found then raise exception 'request not found'; end if;

  select d.operator_id into v_operator_id
  from public.quote_request_dispatches d
  join public.operator_members om on om.operator_id = d.operator_id
  where d.quote_request_id = p_request_id and om.user_id = v_uid
  limit 1;
  if v_operator_id is null then
    raise exception 'forbidden: operator not dispatched to this request';
  end if;

  if v_request_status not in ('sent', 'quoted', 'partially_accepted') then
    raise exception 'request status % does not accept new quotes', v_request_status;
  end if;

  update public.quotes set status = 'superseded'
  where quote_request_id = p_request_id
    and operator_id = v_operator_id
    and status = 'submitted';

  insert into public.quotes (
    quote_request_id, operator_id, status, total_amount, currency,
    exchange_rate_usd_ars, payment_terms, valid_until, notes, submitted_by
  ) values (
    p_request_id, v_operator_id, 'submitted', p_total_amount, p_currency,
    case when p_currency = 'ARS' then p_exchange_rate_usd_ars else null end,
    nullif(trim(p_payment_terms), ''), p_valid_until,
    nullif(trim(p_notes), ''), v_uid
  ) returning id into v_quote_id;

  if jsonb_typeof(p_items) = 'array' then
    for v_item in select * from jsonb_array_elements(p_items) loop
      if v_item ? 'description' and v_item ? 'amount' then
        insert into public.quote_items (quote_id, sort_order, description, amount)
        values (v_quote_id, v_order, trim(v_item->>'description'),
                (v_item->>'amount')::numeric);
        v_order := v_order + 1;
      end if;
    end loop;
  end if;

  if v_request_status = 'sent' then
    update public.quote_requests set status = 'quoted' where id = p_request_id;
    insert into public.quote_request_status_history (quote_request_id, from_status, to_status, changed_by)
    values (p_request_id, 'sent', 'quoted', v_uid);
  end if;

  return v_quote_id;
end;
$$;

-- ============================================================================
-- M6 — get_trip_summary y generate_client_summary_token bloquean
-- estados pre-aceptación. El cliente nunca debería ver borradores.
-- ============================================================================
create or replace function public.get_trip_summary(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status public.request_status;
  v_result jsonb;
begin
  select status into v_status
  from public.quote_requests
  where client_summary_token = p_token;
  if not found then return null; end if;
  if v_status in ('draft', 'sent', 'cancelled') then return null; end if;

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
      (select jsonb_agg(jsonb_build_object(
        'full_name', p.full_name,
        'passenger_type', p.passenger_type,
        'nationality', p.nationality
      ) order by p.created_at)
      from public.passengers p where p.quote_request_id = r.id),
      '[]'::jsonb
    ),
    'documents', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'id', a2.id,
        'file_name', a2.file_name,
        'kind', a2.kind,
        'size_bytes', a2.size_bytes
      ) order by a2.created_at desc)
      from public.attachments a2
      where a2.quote_request_id = r.id
        and a2.shared_with_client = true
        and a2.kind in ('voucher', 'invoice', 'file_doc', 'reservation')),
      '[]'::jsonb
    )
  ) into v_result
  from public.quote_requests r
  join public.agencies a on a.id = r.agency_id
  left join public.reservations res on res.quote_request_id = r.id
  left join public.operators op on op.id = res.operator_id
  where r.client_summary_token = p_token;

  return v_result;
end;
$$;

drop function if exists public.generate_client_summary_token(uuid);

create or replace function public.generate_client_summary_token(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_status public.request_status;
  v_token uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select agency_id, status, client_summary_token
    into v_agency_id, v_status, v_token
    from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_status in ('draft', 'sent', 'cancelled') then
    raise exception 'cannot generate summary in % state', v_status;
  end if;

  if v_token is null then
    v_token := gen_random_uuid();
    update public.quote_requests
      set client_summary_token = v_token
      where id = p_request_id;
  end if;

  return v_token::text;
end;
$$;

grant execute on function public.generate_client_summary_token(uuid) to authenticated;

-- ============================================================================
-- M7 — Notifications con check de longitud.
-- ============================================================================
alter table public.notifications drop constraint if exists notifications_title_length;
alter table public.notifications drop constraint if exists notifications_body_length;
alter table public.notifications
  add constraint notifications_title_length check (length(title) <= 200) not valid,
  add constraint notifications_body_length check (body is null or length(body) <= 1000) not valid;

-- ============================================================================
-- N5 — Telegram link code: rate limit en consume + tabla de attempts.
-- ============================================================================
create table if not exists public.telegram_consume_attempts (
  chat_id bigint not null,
  attempted_at timestamptz not null default now()
);
create index if not exists telegram_consume_attempts_chat_idx
  on public.telegram_consume_attempts(chat_id, attempted_at desc);

alter table public.telegram_consume_attempts enable row level security;

create or replace function public.consume_telegram_link_code(
  p_code text,
  p_chat_id bigint,
  p_username text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_recent integer;
begin
  -- Rate limit: max 5 intentos en 5 minutos por chat_id.
  select count(*) into v_recent
  from public.telegram_consume_attempts
  where chat_id = p_chat_id and attempted_at > now() - interval '5 minutes';
  if v_recent >= 5 then
    raise exception 'too many attempts, try again later';
  end if;

  insert into public.telegram_consume_attempts (chat_id) values (p_chat_id);

  -- Cleanup oportunista de attempts viejos.
  delete from public.telegram_consume_attempts
  where attempted_at < now() - interval '1 hour';

  delete from public.telegram_link_codes
    where code = upper(trim(p_code))
      and expires_at > now()
    returning user_id into v_user_id;
  if v_user_id is null then return false; end if;

  insert into public.telegram_links (user_id, chat_id, username)
  values (v_user_id, p_chat_id, nullif(trim(p_username), ''))
  on conflict (user_id) do update
    set chat_id = excluded.chat_id,
        username = excluded.username,
        created_at = now();
  return true;
end;
$$;
