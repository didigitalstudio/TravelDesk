-- TravelDesk — Iteración 6: aceptación de cotizaciones
-- La agencia acepta una quote (total) o un subset de ítems (parcial).
-- Las otras quotes submitted del mismo request quedan rejected automáticamente.

-- ============================================================================
-- Schema additions
-- ============================================================================
alter table public.quote_items
  add column accepted_at timestamptz;

create index quote_items_accepted_idx
  on public.quote_items(quote_id)
  where accepted_at is not null;

-- ============================================================================
-- RPC: accept_quote (total)
-- ============================================================================
create or replace function public.accept_quote(p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
  v_agency_id uuid;
  v_quote_status public.quote_status;
  v_request_status public.request_status;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select q.quote_request_id, q.status, r.agency_id, r.status
    into v_request_id, v_quote_status, v_agency_id, v_request_status
  from public.quotes q
  join public.quote_requests r on r.id = q.quote_request_id
  where q.id = p_quote_id;
  if not found then raise exception 'quote not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_quote_status <> 'submitted' then
    raise exception 'quote is % and cannot be accepted', v_quote_status;
  end if;
  if v_request_status in ('cancelled', 'closed') then
    raise exception 'request is % and cannot accept quotes', v_request_status;
  end if;

  -- Marcar todos los items de la quote como aceptados
  update public.quote_items
    set accepted_at = now()
    where quote_id = p_quote_id
      and accepted_at is null;

  -- Aceptar esta quote
  update public.quotes set status = 'accepted' where id = p_quote_id;

  -- Rechazar las otras quotes submitted del mismo request
  update public.quotes
    set status = 'rejected'
    where quote_request_id = v_request_id
      and id <> p_quote_id
      and status = 'submitted';

  -- Cambiar el estado de la request a 'accepted'
  if v_request_status <> 'accepted' then
    update public.quote_requests set status = 'accepted' where id = v_request_id;
    insert into public.quote_request_status_history
      (quote_request_id, from_status, to_status, changed_by)
    values
      (v_request_id, v_request_status, 'accepted', v_uid);
  end if;
end;
$$;

grant execute on function public.accept_quote(uuid) to authenticated;

-- ============================================================================
-- RPC: accept_quote_items (parcial)
-- ============================================================================
create or replace function public.accept_quote_items(
  p_quote_id uuid,
  p_item_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
  v_agency_id uuid;
  v_quote_status public.quote_status;
  v_request_status public.request_status;
  v_total_items integer;
  v_accepted_items integer;
  v_new_request_status public.request_status;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_item_ids is null or array_length(p_item_ids, 1) is null then
    raise exception 'no items selected';
  end if;

  select q.quote_request_id, q.status, r.agency_id, r.status
    into v_request_id, v_quote_status, v_agency_id, v_request_status
  from public.quotes q
  join public.quote_requests r on r.id = q.quote_request_id
  where q.id = p_quote_id;
  if not found then raise exception 'quote not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_quote_status <> 'submitted' then
    raise exception 'quote is % and cannot be accepted', v_quote_status;
  end if;
  if v_request_status in ('cancelled', 'closed') then
    raise exception 'request is % and cannot accept quotes', v_request_status;
  end if;

  -- Validar que TODOS los items pertenezcan a esta quote
  if exists (
    select 1 from unnest(p_item_ids) as it(id)
    where not exists (
      select 1 from public.quote_items qi
      where qi.id = it.id and qi.quote_id = p_quote_id
    )
  ) then
    raise exception 'one or more items do not belong to this quote';
  end if;

  -- Marcar items aceptados (los demás quedan sin accepted_at = no aceptados)
  update public.quote_items
    set accepted_at = now()
    where quote_id = p_quote_id
      and id = any(p_item_ids)
      and accepted_at is null;

  -- Si se aceptaron TODOS los items de la quote, es total; si no, parcial
  select count(*), count(*) filter (where accepted_at is not null)
    into v_total_items, v_accepted_items
  from public.quote_items where quote_id = p_quote_id;

  update public.quotes set status = 'accepted' where id = p_quote_id;

  -- Rechazar las otras quotes del mismo request
  update public.quotes
    set status = 'rejected'
    where quote_request_id = v_request_id
      and id <> p_quote_id
      and status = 'submitted';

  if v_total_items = v_accepted_items then
    v_new_request_status := 'accepted';
  else
    v_new_request_status := 'partially_accepted';
  end if;

  if v_request_status <> v_new_request_status then
    update public.quote_requests set status = v_new_request_status where id = v_request_id;
    insert into public.quote_request_status_history
      (quote_request_id, from_status, to_status, changed_by)
    values
      (v_request_id, v_request_status, v_new_request_status, v_uid);
  end if;
end;
$$;

grant execute on function public.accept_quote_items(uuid, uuid[]) to authenticated;

-- ============================================================================
-- RPC: reject_quote (rechazo manual desde agencia)
-- ============================================================================
create or replace function public.reject_quote(p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_status public.quote_status;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select r.agency_id, q.status into v_agency_id, v_status
  from public.quotes q
  join public.quote_requests r on r.id = q.quote_request_id
  where q.id = p_quote_id;
  if not found then raise exception 'quote not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_status <> 'submitted' then
    raise exception 'quote is % and cannot be rejected', v_status;
  end if;

  update public.quotes set status = 'rejected' where id = p_quote_id;
end;
$$;

grant execute on function public.reject_quote(uuid) to authenticated;
