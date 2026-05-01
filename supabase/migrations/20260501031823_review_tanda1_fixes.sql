-- TravelDesk — Review tanda 1: críticos + altos seleccionados.
-- Fixes B1, B3-B6, B8, A1, A3, A5, A12 reportados por la auditoría.

-- ============================================================================
-- B3 — register_attachment debe rechazar payment_receipt cuando lo sube el operador
-- y reservar la subida del operador a kinds reservation/voucher/invoice/file_doc.
-- ============================================================================
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

  if p_operator_id is null then
    -- Lado agencia
    if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
    if p_kind in ('reservation', 'voucher', 'invoice', 'file_doc') then
      raise exception 'kind % no puede ser subido por la agencia', p_kind;
    end if;
  else
    -- Lado operador
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
-- B4 — verify_payment solo acepta payment_pending (no closed)
-- ============================================================================
create or replace function public.verify_payment(p_payment_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
  v_operator_id uuid;
  v_request_status public.request_status;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select quote_request_id, operator_id into v_request_id, v_operator_id
  from public.payments where id = p_payment_id;
  if not found then raise exception 'payment not found'; end if;
  if not public.is_operator_member(v_operator_id) then raise exception 'forbidden'; end if;

  select status into v_request_status from public.quote_requests where id = v_request_id;
  if v_request_status <> 'payment_pending' then
    raise exception 'request must be payment_pending (current: %)', v_request_status;
  end if;

  update public.payments
    set verified_at = now(),
        verified_by = v_uid,
        notes = coalesce(nullif(trim(p_notes), ''), notes)
    where id = p_payment_id;

  update public.quote_requests set status = 'closed' where id = v_request_id;
  insert into public.quote_request_status_history
    (quote_request_id, from_status, to_status, changed_by, notes)
  values (v_request_id, 'payment_pending', 'closed', v_uid, nullif(trim(p_notes), ''));
end;
$$;

-- ============================================================================
-- B5 — unregister_payment_receipt borra los attachments payment_receipt
-- (devuelve los storage_paths para que el caller los borre del bucket).
-- ============================================================================
drop function if exists public.unregister_payment_receipt(uuid);

create or replace function public.unregister_payment_receipt(p_request_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_request_status public.request_status;
  v_verified boolean;
  v_paths text[];
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select agency_id, status into v_agency_id, v_request_status
  from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_request_status <> 'payment_pending' then
    raise exception 'request not in payment_pending';
  end if;

  select verified_at is not null into v_verified
  from public.payments where quote_request_id = p_request_id;
  if v_verified then raise exception 'pago ya verificado por el operador'; end if;

  update public.payments
    set receipt_uploaded_at = null
    where quote_request_id = p_request_id;

  -- Borrar attachments payment_receipt y devolver sus paths.
  with deleted as (
    delete from public.attachments
      where quote_request_id = p_request_id
        and kind = 'payment_receipt'
      returning storage_path
  )
  select coalesce(array_agg(storage_path), array[]::text[])
    into v_paths
  from deleted;

  update public.quote_requests set status = 'issued' where id = p_request_id;
  insert into public.quote_request_status_history
    (quote_request_id, from_status, to_status, changed_by)
  values (p_request_id, 'payment_pending', 'issued', v_uid);

  return v_paths;
end;
$$;

grant execute on function public.unregister_payment_receipt(uuid) to authenticated;

-- ============================================================================
-- B5 (cont) — register_payment_receipt cuenta solo receipts subidos por la agencia
-- (operator_id is null), por defensa en profundidad sumada al fix B3.
-- ============================================================================
create or replace function public.register_payment_receipt(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_request_status public.request_status;
  v_payment_id uuid;
  v_has_receipt boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select agency_id, status into v_agency_id, v_request_status
  from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_request_status not in ('issued', 'payment_pending') then
    raise exception 'request must be issued or payment_pending (current: %)', v_request_status;
  end if;

  select id into v_payment_id from public.payments where quote_request_id = p_request_id;
  if v_payment_id is null then raise exception 'payment row not found'; end if;

  select exists (
    select 1 from public.attachments
    where quote_request_id = p_request_id
      and kind = 'payment_receipt'
      and operator_id is null
  ) into v_has_receipt;
  if not v_has_receipt then
    raise exception 'al menos un comprobante de pago debe estar subido';
  end if;

  update public.payments
    set receipt_uploaded_at = coalesce(receipt_uploaded_at, now())
    where id = v_payment_id;

  if v_request_status = 'issued' then
    update public.quote_requests set status = 'payment_pending' where id = p_request_id;
    insert into public.quote_request_status_history
      (quote_request_id, from_status, to_status, changed_by)
    values (p_request_id, 'issued', 'payment_pending', v_uid);
  end if;
end;
$$;

-- ============================================================================
-- B6 — consume_telegram_link_code: borrar links previos del chat_id antes
-- del upsert, para evitar unique_violation en chat_id.
-- ============================================================================
create or replace function public.consume_telegram_link_code(
  p_code text,
  p_chat_id bigint,
  p_username text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  delete from public.telegram_link_codes
    where code = upper(trim(p_code))
      and expires_at > now()
    returning user_id into v_user_id;
  if v_user_id is null then return false; end if;

  -- Liberá el chat_id si ya estaba linkeado a otro user.
  delete from public.telegram_links
    where chat_id = p_chat_id and user_id <> v_user_id;

  insert into public.telegram_links (user_id, chat_id, username)
  values (v_user_id, p_chat_id, nullif(trim(p_username), ''))
  on conflict (user_id) do update
    set chat_id = excluded.chat_id,
        username = excluded.username,
        created_at = now();
  return true;
end;
$$;

-- ============================================================================
-- B8 — Storage policies: payment_receipt es solo de la agencia.
-- Path: {agency_id}/{request_id}/{kind}/{uniq}-{filename}
-- foldername(name)[3] = kind
-- Para el operador, dejamos fuera payment_receipt en select/insert/delete.
-- ============================================================================
drop policy if exists "storage_attachments_select_operator" on storage.objects;
create policy "storage_attachments_select_operator"
on storage.objects for select
using (
  bucket_id = 'attachments'
  and public.is_operator_dispatched_to_request(
    ((storage.foldername(name))[2])::uuid
  )
  and (storage.foldername(name))[3] <> 'payment_receipt'
);

drop policy if exists "storage_attachments_insert_operator" on storage.objects;
create policy "storage_attachments_insert_operator"
on storage.objects for insert
with check (
  bucket_id = 'attachments'
  and public.is_operator_dispatched_to_request(
    ((storage.foldername(name))[2])::uuid
  )
  and (storage.foldername(name))[3] <> 'payment_receipt'
);

drop policy if exists "storage_attachments_delete_operator" on storage.objects;
create policy "storage_attachments_delete_operator"
on storage.objects for delete
using (
  bucket_id = 'attachments'
  and public.is_operator_dispatched_to_request(
    ((storage.foldername(name))[2])::uuid
  )
  and (storage.foldername(name))[3] <> 'payment_receipt'
);

-- ============================================================================
-- A1 — get_trip_summary no debe devolver notas internas de la agencia.
-- Dropeamos "notes" del jsonb. Si querés exponer algo al cliente, hacelo en
-- un campo nuevo (no implementado todavía).
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
          'passenger_type', p.passenger_type
        ) order by p.created_at
      )
      from public.passengers p where p.quote_request_id = r.id),
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
-- A3 — agency_member_emails / operator_member_emails: limitar quién puede
-- consultarlos. Solo members del MISMO tenant pueden leer la lista (no
-- contrapartes despachadas/linkeadas). Las notificaciones cross-tenant
-- siguen funcionando vía notify_*_members (que validan internamente).
-- Esto cierra la pesca cross-tenant.
-- ============================================================================
create or replace function public.agency_member_emails(p_agency_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select array_agg(distinct u.email::text)
  from public.agency_members m
  join auth.users u on u.id = m.user_id
  where m.agency_id = p_agency_id
    and u.email is not null
    and public.is_agency_member(p_agency_id);
$$;

create or replace function public.operator_member_emails(p_operator_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select array_agg(distinct u.email::text)
  from public.operator_members m
  join auth.users u on u.id = m.user_id
  where m.operator_id = p_operator_id
    and u.email is not null
    and public.is_operator_member(p_operator_id);
$$;

-- Para mandar mails cross-tenant (ej. operador → agencia o viceversa),
-- ahora usamos RPCs específicos que exponen sólo la lista al server-side
-- gateado por relación dispatched/linked. Mismo patron que notify_*_members.
create or replace function public.relayed_agency_member_emails(p_agency_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select array_agg(distinct u.email::text)
  from public.agency_members m
  join auth.users u on u.id = m.user_id
  where m.agency_id = p_agency_id
    and u.email is not null
    and (
      public.is_agency_member(p_agency_id)
      or exists (
        select 1 from public.quote_request_dispatches d
        join public.quote_requests r on r.id = d.quote_request_id
        join public.operator_members om on om.operator_id = d.operator_id
        where r.agency_id = p_agency_id and om.user_id = auth.uid()
      )
    );
$$;

create or replace function public.relayed_operator_member_emails(p_operator_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select array_agg(distinct u.email::text)
  from public.operator_members m
  join auth.users u on u.id = m.user_id
  where m.operator_id = p_operator_id
    and u.email is not null
    and (
      public.is_operator_member(p_operator_id)
      or exists (
        select 1 from public.agency_operator_links l
        join public.agency_members am on am.agency_id = l.agency_id
        where l.operator_id = p_operator_id and am.user_id = auth.uid()
      )
    );
$$;

grant execute on function public.relayed_agency_member_emails(uuid) to authenticated;
grant execute on function public.relayed_operator_member_emails(uuid) to authenticated;

-- ============================================================================
-- A5 — cancel_quote_request limpia el payment row si existía (lo borra,
-- ya que cancelar el viaje invalida el cobro).
-- ============================================================================
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

  delete from public.payments where quote_request_id = p_request_id;

  update public.quote_requests set status = 'cancelled' where id = p_request_id;
  insert into public.quote_request_status_history (quote_request_id, from_status, to_status, changed_by, notes)
  values (p_request_id, v_status, 'cancelled', v_uid, p_notes);
end;
$$;

-- ============================================================================
-- A12 — get_agency_drive_refresh_token requiere admin (no member regular).
-- ============================================================================
create or replace function public.get_agency_drive_refresh_token(p_agency_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_token text;
begin
  if not public.is_agency_admin(p_agency_id) then raise exception 'forbidden: requires admin'; end if;
  select refresh_token into v_token
  from public.agency_google_drive_connections
  where agency_id = p_agency_id;
  return v_token;
end;
$$;

-- ============================================================================
-- B1 — update_quote_request: si p_client_id es NULL y p_clear_client es false,
-- mantener el client_id actual (no desvincular silenciosamente).
-- Drop del overload viejo + create con la nueva signature.
-- ============================================================================
drop function if exists public.update_quote_request(
  uuid, text, text, integer, integer, integer, public.service_type[], citext, text,
  date, date, boolean, text, uuid
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
  p_client_id uuid default null,
  p_clear_client boolean default false
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
  v_new_client_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select agency_id, status into v_agency_id, v_status
  from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_status not in ('draft', 'sent') then
    raise exception 'request cannot be edited in status %', v_status;
  end if;

  if p_clear_client then
    v_new_client_id := null;
  elsif p_client_id is not null then
    select agency_id into v_client_agency from public.clients where id = p_client_id;
    if v_client_agency is null or v_client_agency <> v_agency_id then
      raise exception 'client does not belong to this agency';
    end if;
    v_new_client_id := p_client_id;
  else
    select client_id into v_new_client_id from public.quote_requests where id = p_request_id;
  end if;

  update public.quote_requests set
    client_id = v_new_client_id,
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
  uuid, text, text, integer, integer, integer, public.service_type[], citext, text,
  date, date, boolean, text, uuid, boolean
) to authenticated;
