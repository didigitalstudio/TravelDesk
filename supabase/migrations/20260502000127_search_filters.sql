-- RPCs de búsqueda con joins. Sin security definer: respetan RLS del caller.
-- Filtran a la agencia del caller; cualquier intento de otra agency_id
-- queda vacío por las policies de quote_requests/payments.

-- ============================================================================
-- search_agency_requests: matchea code, client_name, destination, nombre del
-- operador despachado, nombre de pasajeros. Filtro opcional por status.
-- ============================================================================
create or replace function public.search_agency_requests(
  p_agency_id uuid,
  p_query text default null,
  p_status text default null
) returns setof public.quote_requests
language sql
stable
set search_path = public
as $$
  select distinct r.*
  from public.quote_requests r
  left join public.quote_request_dispatches d on d.quote_request_id = r.id
  left join public.operators o on o.id = d.operator_id
  left join public.passengers ps on ps.quote_request_id = r.id
  where r.agency_id = p_agency_id
    and (p_status is null or p_status = '' or r.status::text = p_status)
    and (
      p_query is null or trim(p_query) = ''
      or r.code ilike '%' || trim(p_query) || '%'
      or r.client_name ilike '%' || trim(p_query) || '%'
      or r.destination ilike '%' || trim(p_query) || '%'
      or o.name ilike '%' || trim(p_query) || '%'
      or ps.full_name ilike '%' || trim(p_query) || '%'
    )
  order by r.created_at desc
  limit 200;
$$;

grant execute on function public.search_agency_requests(uuid, text, text) to authenticated;

-- ============================================================================
-- search_agency_payments: filtra payments de la agencia por estado
-- (pending_receipt | pending_verification | verified) y rango de due_date.
-- Búsqueda por code de la request, cliente o nombre de operador.
-- Devuelve metadata necesaria para la lista (request code/cliente/operador).
-- ============================================================================
create or replace function public.search_agency_payments(
  p_agency_id uuid,
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
  operator_id uuid,
  operator_name text
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
    o.id as operator_id,
    o.name as operator_name
  from public.payments p
  join public.quote_requests r on r.id = p.quote_request_id
  join public.operators o on o.id = p.operator_id
  where p.agency_id = p_agency_id
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
      or o.name ilike '%' || trim(p_query) || '%'
    )
  order by
    case when p.due_date is null then 1 else 0 end,
    p.due_date asc nulls last,
    r.created_at desc
  limit 300;
$$;

grant execute on function public.search_agency_payments(uuid, text, text, date, date) to authenticated;
