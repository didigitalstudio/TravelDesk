-- TravelDesk — Iteración 15: resumen de viaje al cliente final
-- La agencia genera un token público que apunta a una vista read-only del
-- viaje. La página /trip/[token] no requiere auth — la RPC valida el token.

alter table public.quote_requests
  add column client_summary_token uuid;

create unique index quote_requests_summary_token_idx
  on public.quote_requests(client_summary_token)
  where client_summary_token is not null;

-- ============================================================================
-- RPC: generar/recuperar token (idempotente)
-- ============================================================================
create or replace function public.generate_client_summary_token(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_token uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select agency_id, client_summary_token into v_agency_id, v_token
  from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;

  if v_token is null then
    update public.quote_requests
      set client_summary_token = gen_random_uuid()
      where id = p_request_id
      returning client_summary_token into v_token;
  end if;
  return v_token::text;
end;
$$;

grant execute on function public.generate_client_summary_token(uuid) to authenticated;

create or replace function public.revoke_client_summary_token(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select agency_id into v_agency_id from public.quote_requests where id = p_request_id;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  update public.quote_requests
    set client_summary_token = null
    where id = p_request_id;
end;
$$;

grant execute on function public.revoke_client_summary_token(uuid) to authenticated;

-- ============================================================================
-- RPC: lectura pública por token (anónima permitida)
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
      'notes', r.notes,
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
      'notes', res.notes,
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

grant execute on function public.get_trip_summary(uuid) to anon, authenticated;
