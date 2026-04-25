-- Re-declarar create_quote_request con DEFAULT NULL en los parámetros opcionales,
-- para que los tipos TS generados los marquen como `string | null | undefined`
-- en vez de exigirlos como required.

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
  p_notes text default null
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
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_agency_member(p_agency_id) then
    raise exception 'forbidden: not a member of this agency';
  end if;

  update public.agencies
    set request_count = request_count + 1
    where id = p_agency_id
    returning request_count into v_seq;

  v_code := 'TD-' || lpad(v_seq::text, 4, '0');

  insert into public.quote_requests (
    agency_id, code, status, client_name, client_email, client_phone,
    destination, departure_date, return_date, flexible_dates,
    pax_adults, pax_children, pax_infants, services, notes, created_by
  ) values (
    p_agency_id, v_code, 'draft', p_client_name, p_client_email, p_client_phone,
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

-- Drop la versión anterior (signature distinta), porque postgres distingue por
-- cantidad/tipo de params.
drop function if exists public.create_quote_request(
  uuid, text, citext, text, text, date, date, boolean, integer, integer, integer, public.service_type[], text
);

grant execute on function public.create_quote_request(
  uuid, text, text, integer, integer, integer, public.service_type[], citext, text, date, date, boolean, text
) to authenticated;

-- cancel_quote_request: ya tiene default null en p_notes; no hace falta cambiar.
