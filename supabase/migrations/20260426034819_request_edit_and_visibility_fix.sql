-- TravelDesk — Iter 11a
-- 1) Fix RLS: agency<->operator visibility cuando hay link o dispatch.
--    Bug iter 4: el SELECT de la lista del operador hace agencies!inner pero
--    la policy de agencies sólo permitía leer si sos member de la agencia.
--    Lo mismo del lado agencia para operators (sólo veía si había link, no
--    cubría dispatches huérfanos).
-- 2) RPCs update_quote_request y delete_quote_request — sólo en draft/sent.

-- ============================================================================
-- 1) Visibility cross-tenant
-- ============================================================================

-- Operator member puede ver agencias que lo despacharon o vincularon.
create policy "agencies_select_linked_or_dispatched_operator"
on public.agencies for select
using (
  exists (
    select 1
    from public.agency_operator_links l
    join public.operator_members om on om.operator_id = l.operator_id
    where l.agency_id = agencies.id
      and om.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.quote_request_dispatches d
    join public.quote_requests r on r.id = d.quote_request_id
    join public.operator_members om on om.operator_id = d.operator_id
    where r.agency_id = agencies.id
      and om.user_id = auth.uid()
  )
);

-- Agency member puede ver operators a los que ya les despachó algo, además
-- del link existente (la policy operators_select_linked_agency ya cubría link).
create policy "operators_select_dispatched_by_agency"
on public.operators for select
using (
  exists (
    select 1
    from public.quote_request_dispatches d
    join public.quote_requests r on r.id = d.quote_request_id
    where d.operator_id = operators.id
      and public.is_agency_member(r.agency_id)
  )
);

-- ============================================================================
-- 2) Update / delete de quote_requests
-- ============================================================================

create or replace function public.update_quote_request(
  p_request_id uuid,
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
  if not public.is_agency_member(v_agency_id) then
    raise exception 'forbidden';
  end if;
  if v_status not in ('draft', 'sent') then
    raise exception 'request can no longer be edited (status %)', v_status;
  end if;

  update public.quote_requests
    set client_name = p_client_name,
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
  uuid, text, citext, text, text, date, date, boolean, integer, integer, integer,
  public.service_type[], text
) to authenticated;

create or replace function public.delete_quote_request(p_request_id uuid)
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
  if not public.is_agency_member(v_agency_id) then
    raise exception 'forbidden';
  end if;
  if v_status not in ('draft', 'sent') then
    raise exception 'request can no longer be deleted (status %)', v_status;
  end if;

  -- Cascade a dispatches y history; si ya hay quotes/passengers/attachments en
  -- algún caso edge, los borramos para no dejar huérfanos.
  delete from public.quote_request_dispatches where quote_request_id = p_request_id;
  delete from public.quote_request_status_history where quote_request_id = p_request_id;
  delete from public.quote_requests where id = p_request_id;
end;
$$;

grant execute on function public.delete_quote_request(uuid) to authenticated;
