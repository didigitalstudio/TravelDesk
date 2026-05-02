-- RPCs de búsqueda para el portal operador. Sin security definer:
-- respetan RLS (operator ve solo requests dispatched a él).

-- search_operator_requests: matchea code, agencia, destino, cliente
-- (cuando es visible) y nombre de pasajeros. Filtro por status.
create or replace function public.search_operator_requests(
  p_operator_id uuid,
  p_query text default null,
  p_status text default null
) returns table (
  request_id uuid,
  code text,
  status public.request_status,
  client_name text,
  destination text,
  departure_date date,
  return_date date,
  flexible_dates boolean,
  pax_adults integer,
  pax_children integer,
  pax_infants integer,
  bsp_due_date date,
  agency_id uuid,
  agency_name text,
  sent_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select distinct
    r.id as request_id,
    r.code,
    r.status,
    r.client_name,
    r.destination,
    r.departure_date,
    r.return_date,
    r.flexible_dates,
    r.pax_adults,
    r.pax_children,
    r.pax_infants,
    r.bsp_due_date,
    a.id as agency_id,
    a.name as agency_name,
    d.sent_at
  from public.quote_request_dispatches d
  join public.quote_requests r on r.id = d.quote_request_id
  join public.agencies a on a.id = r.agency_id
  left join public.passengers ps on ps.quote_request_id = r.id
  where d.operator_id = p_operator_id
    and (p_status is null or p_status = '' or r.status::text = p_status)
    and (
      p_query is null or trim(p_query) = ''
      or r.code ilike '%' || trim(p_query) || '%'
      or r.destination ilike '%' || trim(p_query) || '%'
      or a.name ilike '%' || trim(p_query) || '%'
      or (
        r.status in ('accepted','partially_accepted','reserved','docs_uploaded','issued','payment_pending','closed')
        and r.client_name ilike '%' || trim(p_query) || '%'
      )
      or ps.full_name ilike '%' || trim(p_query) || '%'
    )
  order by d.sent_at desc
  limit 200;
$$;

grant execute on function public.search_operator_requests(uuid, text, text) to authenticated;

-- search_operator_payments: filtra payments donde el operator_id es el caller.
-- Mismo modelo que el de agency pero invertido.
create or replace function public.search_operator_payments(
  p_operator_id uuid,
  p_query text default null,
  p_stage text default null,
  p_due_from date default null,
  p_due_to date default null
) returns table (
  payment_id uuid,
  amount numeric,
  currency public.currency,
  due_date date,
  receipt_uploaded_at timestamptz,
  verified_at timestamptz,
  request_id uuid,
  request_code text,
  request_status public.request_status,
  client_name text,
  agency_id uuid,
  agency_name text
)
language sql
stable
set search_path = public
as $$
  select
    p.id as payment_id,
    p.amount,
    p.currency,
    p.due_date,
    p.receipt_uploaded_at,
    p.verified_at,
    r.id as request_id,
    r.code as request_code,
    r.status as request_status,
    r.client_name,
    a.id as agency_id,
    a.name as agency_name
  from public.payments p
  join public.quote_requests r on r.id = p.quote_request_id
  join public.agencies a on a.id = p.agency_id
  where p.operator_id = p_operator_id
    and (
      p_stage is null or p_stage = ''
      or (p_stage = 'verified' and p.verified_at is not null)
      or (p_stage = 'pending_verification' and p.verified_at is null and p.receipt_uploaded_at is not null)
      or (p_stage = 'pending_receipt' and p.verified_at is null and p.receipt_uploaded_at is null)
    )
    and (p_due_from is null or p.due_date is null or p.due_date >= p_due_from)
    and (p_due_to is null or p.due_date is null or p.due_date <= p_due_to)
    and (
      p_query is null or trim(p_query) = ''
      or r.code ilike '%' || trim(p_query) || '%'
      or r.client_name ilike '%' || trim(p_query) || '%'
      or a.name ilike '%' || trim(p_query) || '%'
    )
  order by
    case when p.due_date is null then 1 else 0 end,
    p.due_date asc nulls last,
    r.created_at desc
  limit 300;
$$;

grant execute on function public.search_operator_payments(uuid, text, text, date, date) to authenticated;
