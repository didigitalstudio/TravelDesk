-- TravelDesk — Iteración 9: emisión
-- El operador adjunta vouchers, factura y file. Cuando confirma, la request
-- pasa a 'issued'. La columna issued_at queda disponible para iter 10 (BSP).

alter table public.quote_requests
  add column issued_at timestamptz;

-- ============================================================================
-- RPC: mark_request_issued
-- ============================================================================
create or replace function public.mark_request_issued(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_operator_id uuid;
  v_request_status public.request_status;
  v_has_accepted boolean;
  v_has_reservation boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select d.operator_id into v_operator_id
  from public.quote_request_dispatches d
  join public.operator_members om on om.operator_id = d.operator_id
  where d.quote_request_id = p_request_id and om.user_id = v_uid
  limit 1;
  if v_operator_id is null then raise exception 'forbidden: not dispatched'; end if;

  select status into v_request_status from public.quote_requests where id = p_request_id;
  if v_request_status is null then raise exception 'request not found'; end if;
  if v_request_status in ('cancelled', 'closed') then
    raise exception 'request is %', v_request_status;
  end if;

  select exists (
    select 1 from public.quotes
    where quote_request_id = p_request_id
      and operator_id = v_operator_id
      and status = 'accepted'
  ) into v_has_accepted;
  if not v_has_accepted then
    raise exception 'this operator has no accepted quote on this request';
  end if;

  select exists (
    select 1 from public.reservations
    where quote_request_id = p_request_id
      and operator_id = v_operator_id
  ) into v_has_reservation;
  if not v_has_reservation then
    raise exception 'reservation must be loaded before marking issued';
  end if;

  if v_request_status <> 'issued' then
    update public.quote_requests
      set status = 'issued', issued_at = coalesce(issued_at, now())
      where id = p_request_id;
    insert into public.quote_request_status_history
      (quote_request_id, from_status, to_status, changed_by)
    values
      (p_request_id, v_request_status, 'issued', v_uid);
  end if;
end;
$$;

grant execute on function public.mark_request_issued(uuid) to authenticated;
