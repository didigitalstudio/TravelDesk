-- TravelDesk — RPCs para el wizard conversacional del bot de Telegram.
-- Todas son security definer y validan vía chat_id (sin service_role).

-- ============================================================================
-- RPC: listar agencias del user vinculado al chat.
-- Usado para el step agency_pick cuando un user pertenece a >1 agencia.
-- ============================================================================
create or replace function public.telegram_user_agencies(p_chat_id bigint)
returns table (agency_id uuid, agency_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.telegram_links where chat_id = p_chat_id;
  if v_user_id is null then
    raise exception 'chat not linked';
  end if;

  return query
  select a.id, a.name
  from public.agency_members m
  join public.agencies a on a.id = m.agency_id
  where m.user_id = v_user_id
  order by a.name;
end;
$$;

grant execute on function public.telegram_user_agencies(bigint) to anon, authenticated;

-- ============================================================================
-- RPC: listar operadores vinculados a una agencia.
-- Usado para el step operator_select al despachar.
-- ============================================================================
create or replace function public.telegram_list_linked_operators(
  p_chat_id  bigint,
  p_agency_id uuid
)
returns table (operator_id uuid, operator_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.telegram_links where chat_id = p_chat_id;
  if v_user_id is null then
    raise exception 'chat not linked';
  end if;

  if not exists (
    select 1 from public.agency_members
    where agency_id = p_agency_id and user_id = v_user_id
  ) then
    raise exception 'forbidden: not a member of this agency';
  end if;

  return query
  select o.id, o.name
  from public.agency_operator_links l
  join public.operators o on o.id = l.operator_id
  where l.agency_id = p_agency_id
  order by o.name;
end;
$$;

grant execute on function public.telegram_list_linked_operators(bigint, uuid) to anon, authenticated;

-- ============================================================================
-- RPC: crear solicitud completa desde el wizard.
-- Reemplaza telegram_create_request. Valida todos los campos del draft.
-- telegram_create_request se deja en DB por compatibilidad de rollback.
-- ============================================================================
create or replace function public.telegram_create_full_request(
  p_chat_id bigint,
  p_payload jsonb
)
returns table (request_id uuid, request_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid;
  v_agency_id      uuid;
  v_client_name    text;
  v_destination    text;
  v_pax_adults     integer;
  v_pax_children   integer;
  v_pax_infants    integer;
  v_services       public.service_type[];
  v_flexible       boolean;
  v_departure_date date;
  v_return_date    date;
  v_notes          text;
  v_seq            integer;
  v_code           text;
  v_id             uuid;
begin
  select user_id into v_user_id
  from public.telegram_links where chat_id = p_chat_id;
  if v_user_id is null then
    raise exception 'chat not linked';
  end if;

  v_agency_id    := (p_payload->>'agency_id')::uuid;
  v_client_name  := trim(p_payload->>'client_name');
  v_destination  := trim(p_payload->>'destination');
  v_pax_adults   := coalesce((p_payload->>'pax_adults')::integer, 1);
  v_pax_children := coalesce((p_payload->>'pax_children')::integer, 0);
  v_pax_infants  := coalesce((p_payload->>'pax_infants')::integer, 0);
  v_flexible     := coalesce((p_payload->>'flexible_dates')::boolean, false);
  v_notes        := nullif(trim(coalesce(p_payload->>'notes', '')), '');

  if p_payload->>'departure_date' is not null and p_payload->>'departure_date' <> 'null' then
    v_departure_date := (p_payload->>'departure_date')::date;
  end if;
  if p_payload->>'return_date' is not null and p_payload->>'return_date' <> 'null' then
    v_return_date := (p_payload->>'return_date')::date;
  end if;

  select array_agg(s::public.service_type)
  into v_services
  from jsonb_array_elements_text(coalesce(p_payload->'services', '[]'::jsonb)) as s;

  -- Validaciones
  if v_agency_id is null then
    raise exception 'USER: Falta el id de agencia';
  end if;
  if not exists (
    select 1 from public.agency_members
    where agency_id = v_agency_id and user_id = v_user_id
  ) then
    raise exception 'forbidden: not a member of this agency';
  end if;
  if v_client_name is null or length(v_client_name) < 2 then
    raise exception 'USER: El nombre del cliente debe tener al menos 2 caracteres';
  end if;
  if length(v_client_name) > 200 then
    raise exception 'USER: El nombre del cliente es demasiado largo';
  end if;
  if v_destination is null or length(v_destination) < 2 then
    raise exception 'USER: El destino debe tener al menos 2 caracteres';
  end if;
  if length(v_destination) > 200 then
    raise exception 'USER: El destino es demasiado largo';
  end if;
  if v_pax_adults < 1 then
    raise exception 'USER: Necesitás al menos 1 adulto';
  end if;
  if v_pax_children < 0 or v_pax_infants < 0 then
    raise exception 'USER: La cantidad de pasajeros no puede ser negativa';
  end if;
  if v_services is null or array_length(v_services, 1) is null then
    raise exception 'USER: Seleccioná al menos un servicio';
  end if;
  if v_notes is not null and length(v_notes) > 2000 then
    raise exception 'USER: Las notas son demasiado largas (max 2000 caracteres)';
  end if;
  if not v_flexible then
    if v_departure_date is null then
      raise exception 'USER: Ingresá la fecha de salida o elegí Soy flexible';
    end if;
    if v_departure_date < current_date then
      raise exception 'USER: La fecha de salida no puede ser en el pasado';
    end if;
    if v_return_date is not null and v_return_date < v_departure_date then
      raise exception 'USER: La fecha de regreso debe ser posterior o igual a la salida';
    end if;
  end if;

  -- Generar código
  update public.agencies
    set request_count = request_count + 1
    where id = v_agency_id
    returning request_count into v_seq;

  v_code := 'TD-' || lpad(v_seq::text, 4, '0');

  insert into public.quote_requests (
    agency_id, code, status, client_name, destination,
    pax_adults, pax_children, pax_infants, services,
    flexible_dates, departure_date, return_date, notes, created_by
  ) values (
    v_agency_id, v_code, 'draft', v_client_name, v_destination,
    v_pax_adults, v_pax_children, v_pax_infants, coalesce(v_services, '{}'::service_type[]),
    v_flexible, v_departure_date, v_return_date, v_notes, v_user_id
  )
  returning id into v_id;

  insert into public.quote_request_status_history (quote_request_id, from_status, to_status, changed_by)
  values (v_id, null, 'draft', v_user_id);

  return query select v_id, v_code;
end;
$$;

grant execute on function public.telegram_create_full_request(bigint, jsonb) to anon, authenticated;

-- ============================================================================
-- RPC: despachar solicitud a operadores desde el bot.
-- Valida vía chat_id, inserta dispatches, inserta notificaciones inline,
-- y devuelve emails de miembros por operador para que el TS envíe los mails.
-- ============================================================================
create or replace function public.telegram_dispatch_request(
  p_chat_id     bigint,
  p_request_id  uuid,
  p_operator_ids uuid[]
)
returns table (operator_id uuid, member_emails text[])
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id     uuid;
  v_agency_id   uuid;
  v_status      public.request_status;
  v_code        text;
  v_destination text;
  v_agency_name text;
  v_op          uuid;
begin
  select tl.user_id into v_user_id
  from public.telegram_links tl where tl.chat_id = p_chat_id;
  if v_user_id is null then
    raise exception 'chat not linked';
  end if;

  select r.agency_id, r.status, r.code, r.destination, a.name
  into v_agency_id, v_status, v_code, v_destination, v_agency_name
  from public.quote_requests r
  join public.agencies a on a.id = r.agency_id
  where r.id = p_request_id;

  if not found then
    raise exception 'request not found';
  end if;

  if not exists (
    select 1 from public.agency_members m
    where m.agency_id = v_agency_id and m.user_id = v_user_id
  ) then
    raise exception 'forbidden: not a member of this agency';
  end if;

  if v_status not in ('draft', 'sent') then
    raise exception 'request cannot be sent in status %', v_status;
  end if;

  if p_operator_ids is null or array_length(p_operator_ids, 1) is null then
    raise exception 'no operators selected';
  end if;

  -- Validar que todos los operadores estén vinculados a la agencia
  if exists (
    select 1 from unnest(p_operator_ids) as op(id)
    where not exists (
      select 1 from public.agency_operator_links l
      where l.agency_id = v_agency_id and l.operator_id = op.id
    )
  ) then
    raise exception 'one or more operators are not linked to this agency';
  end if;

  -- Insertar dispatches
  foreach v_op in array p_operator_ids loop
    insert into public.quote_request_dispatches (quote_request_id, operator_id)
    values (p_request_id, v_op)
    on conflict do nothing;
  end loop;

  -- Transición draft → sent con historial
  if v_status = 'draft' then
    update public.quote_requests set status = 'sent' where id = p_request_id;
    insert into public.quote_request_status_history (quote_request_id, from_status, to_status, changed_by)
    values (p_request_id, 'draft', 'sent', v_user_id);
  end if;

  -- Insertar notificaciones inline (mirror de notify_operator_members, validado vía chat_id)
  foreach v_op in array p_operator_ids loop
    insert into public.notifications (user_id, kind, title, body, link)
    select m.user_id,
      'request_dispatched',
      'Nueva solicitud ' || v_code,
      v_agency_name || ' → ' || v_destination,
      '/operator/requests/' || p_request_id::text
    from public.operator_members m
    where m.operator_id = v_op
      and not exists (
        select 1 from public.notifications n
        where n.user_id = m.user_id
          and n.kind = 'request_dispatched'
          and n.link = '/operator/requests/' || p_request_id::text
          and n.read_at is null
          and n.created_at > now() - interval '1 minute'
      );
  end loop;

  -- Devolver emails de miembros por operador para que el TS envíe los mails
  return query
  select op.id::uuid as operator_id,
    coalesce(
      array_agg(distinct u.email::text) filter (where u.email is not null),
      '{}'::text[]
    ) as member_emails
  from unnest(p_operator_ids) as op(id)
  join public.operator_members m on m.operator_id = op.id
  join auth.users u on u.id = m.user_id
  group by op.id;
end;
$$;

grant execute on function public.telegram_dispatch_request(bigint, uuid, uuid[]) to anon, authenticated;
