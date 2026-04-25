-- TravelDesk — Iteración 8: reserva del operador
-- El operador que ganó la cotización (quote.status = accepted) carga el código
-- de reserva (PNR / file / locator) y comprobantes. La request pasa a 'reserved'.

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  reservation_code text not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Una única reserva activa por request (del operador que ganó)
  unique (quote_request_id)
);

create trigger trg_reservations_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

create index reservations_operator_idx on public.reservations(operator_id);
create index reservations_agency_idx on public.reservations(agency_id);

alter table public.reservations enable row level security;

create policy "res_select_agency"
on public.reservations for select
using (public.is_agency_member(agency_id));

create policy "res_select_operator"
on public.reservations for select
using (public.is_operator_member(operator_id));

create policy "res_modify_operator"
on public.reservations for all
using (public.is_operator_member(operator_id))
with check (public.is_operator_member(operator_id));

-- ============================================================================
-- RPC: upsert_reservation
-- Resuelve operator_id desde dispatches + membership del user actual.
-- Sólo el operador con quote 'accepted' puede cargar la reserva.
-- Cambia request.status a 'reserved' la primera vez.
-- ============================================================================
create or replace function public.upsert_reservation(
  p_request_id uuid,
  p_reservation_code text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_operator_id uuid;
  v_agency_id uuid;
  v_request_status public.request_status;
  v_id uuid;
  v_has_accepted_quote boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_reservation_code is null or length(trim(p_reservation_code)) = 0 then
    raise exception 'reservation_code is required';
  end if;

  -- Resolver operator_id del user en este request
  select d.operator_id into v_operator_id
  from public.quote_request_dispatches d
  join public.operator_members om on om.operator_id = d.operator_id
  where d.quote_request_id = p_request_id and om.user_id = v_uid
  limit 1;
  if v_operator_id is null then
    raise exception 'forbidden: operator not dispatched';
  end if;

  -- Verificar que este operador tiene una quote 'accepted' en este request
  select exists (
    select 1 from public.quotes
    where quote_request_id = p_request_id
      and operator_id = v_operator_id
      and status = 'accepted'
  ) into v_has_accepted_quote;
  if not v_has_accepted_quote then
    raise exception 'this operator does not have an accepted quote on this request';
  end if;

  select agency_id, status into v_agency_id, v_request_status
  from public.quote_requests where id = p_request_id;
  if v_request_status in ('cancelled', 'closed') then
    raise exception 'request is % and cannot accept reservation', v_request_status;
  end if;

  insert into public.reservations (
    quote_request_id, operator_id, agency_id, reservation_code, notes, created_by
  ) values (
    p_request_id, v_operator_id, v_agency_id, trim(p_reservation_code),
    nullif(trim(p_notes), ''), v_uid
  )
  on conflict (quote_request_id) do update
    set reservation_code = excluded.reservation_code,
        notes = excluded.notes
  returning id into v_id;

  -- Promover el estado: accepted/partially_accepted → reserved
  if v_request_status in ('accepted', 'partially_accepted') then
    update public.quote_requests set status = 'reserved' where id = p_request_id;
    insert into public.quote_request_status_history
      (quote_request_id, from_status, to_status, changed_by)
    values
      (p_request_id, v_request_status, 'reserved', v_uid);
  end if;

  return v_id;
end;
$$;

grant execute on function public.upsert_reservation(uuid, text, text) to authenticated;
