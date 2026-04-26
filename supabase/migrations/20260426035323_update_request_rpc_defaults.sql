-- Re-declarar update_quote_request con DEFAULT NULL en params opcionales
-- para que los tipos TS los marquen como `string | null | undefined`.

drop function if exists public.update_quote_request(
  uuid, text, citext, text, text, date, date, boolean, integer, integer, integer,
  public.service_type[], text
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
  p_notes text default null
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
  uuid, text, text, integer, integer, integer, public.service_type[], citext, text,
  date, date, boolean, text
) to authenticated;
