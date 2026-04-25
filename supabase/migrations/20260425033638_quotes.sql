-- TravelDesk — Iteración 5: cotizaciones del operador
-- Modela la respuesta del operador a una quote_request: total, moneda, validez,
-- condiciones de pago e ítems (para aceptación parcial en iter 6).

-- ============================================================================
-- Enums
-- ============================================================================
create type public.currency as enum ('USD', 'ARS');

create type public.quote_status as enum (
  'submitted',
  'withdrawn',
  'superseded',
  'accepted',
  'rejected'
);

-- ============================================================================
-- quotes: una cotización enviada por un operador a una request
-- ============================================================================
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  status public.quote_status not null default 'submitted',
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  currency public.currency not null,
  -- Si currency = ARS, snapshot del MEP al momento de la cotización.
  -- Null si currency = USD. Editable por el operador en el form.
  exchange_rate_usd_ars numeric(14, 4),
  payment_terms text,
  valid_until date,
  notes text,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_quotes_updated_at
before update on public.quotes
for each row execute function public.set_updated_at();

create index quotes_request_idx on public.quotes(quote_request_id, submitted_at desc);
create index quotes_operator_idx on public.quotes(operator_id, submitted_at desc);

-- Solo puede haber UNA quote activa (submitted) por (request, operator)
create unique index quotes_active_per_operator_uq
  on public.quotes(quote_request_id, operator_id)
  where status = 'submitted';

-- ============================================================================
-- quote_items: ítems que componen una cotización (para aceptación parcial)
-- ============================================================================
create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  sort_order integer not null default 0,
  description text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index quote_items_quote_idx on public.quote_items(quote_id, sort_order);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

-- quotes: ambos lados ven (agency de la request, operador miembro del operator)
create policy "q_select_agency"
on public.quotes for select
using (
  exists (
    select 1 from public.quote_requests r
    where r.id = quotes.quote_request_id
      and public.is_agency_member(r.agency_id)
  )
);

create policy "q_select_operator"
on public.quotes for select
using (public.is_operator_member(operator_id));

-- Escritura solo via RPC (security definer), pero dejamos una policy mínima
-- por si alguna vez queremos hacer updates directos desde el operador.
create policy "q_modify_operator"
on public.quotes for all
using (public.is_operator_member(operator_id))
with check (public.is_operator_member(operator_id));

-- quote_items: heredan la visibilidad de la quote
create policy "qi_select_via_quote"
on public.quote_items for select
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_items.quote_id
      and (
        public.is_operator_member(q.operator_id)
        or exists (
          select 1 from public.quote_requests r
          where r.id = q.quote_request_id
            and public.is_agency_member(r.agency_id)
        )
      )
  )
);

create policy "qi_modify_operator"
on public.quote_items for all
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_items.quote_id
      and public.is_operator_member(q.operator_id)
  )
)
with check (
  exists (
    select 1 from public.quotes q
    where q.id = quote_items.quote_id
      and public.is_operator_member(q.operator_id)
  )
);

-- ============================================================================
-- RPC: submit_quote
-- ============================================================================
-- Reemplaza automático: si el operador ya tenía una quote submitted para esta
-- request, la marca como 'superseded' antes de insertar la nueva.
-- Cambia el estado de la request a 'quoted' si era 'sent'.
create or replace function public.submit_quote(
  p_request_id uuid,
  p_total_amount numeric,
  p_currency public.currency,
  p_payment_terms text default null,
  p_valid_until date default null,
  p_notes text default null,
  p_exchange_rate_usd_ars numeric default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_operator_id uuid;
  v_request_status public.request_status;
  v_request_agency uuid;
  v_quote_id uuid;
  v_item jsonb;
  v_order integer := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_total_amount is null or p_total_amount < 0 then
    raise exception 'invalid total amount';
  end if;

  -- Verificar que la request existe y el user es operador despachado
  select r.agency_id, r.status into v_request_agency, v_request_status
  from public.quote_requests r where r.id = p_request_id;
  if not found then
    raise exception 'request not found';
  end if;

  -- Resolver el operator_id del user actual que está despachado a esta request
  select d.operator_id into v_operator_id
  from public.quote_request_dispatches d
  join public.operator_members om on om.operator_id = d.operator_id
  where d.quote_request_id = p_request_id
    and om.user_id = v_uid
  limit 1;

  if v_operator_id is null then
    raise exception 'forbidden: operator not dispatched to this request';
  end if;

  if v_request_status in ('cancelled', 'closed') then
    raise exception 'request is % and cannot receive quotes', v_request_status;
  end if;

  -- Supersede quote anterior del mismo operador si existe
  update public.quotes
  set status = 'superseded'
  where quote_request_id = p_request_id
    and operator_id = v_operator_id
    and status = 'submitted';

  insert into public.quotes (
    quote_request_id, operator_id, status, total_amount, currency,
    exchange_rate_usd_ars, payment_terms, valid_until, notes, submitted_by
  ) values (
    p_request_id, v_operator_id, 'submitted', p_total_amount, p_currency,
    case when p_currency = 'ARS' then p_exchange_rate_usd_ars else null end,
    nullif(trim(p_payment_terms), ''),
    p_valid_until,
    nullif(trim(p_notes), ''),
    v_uid
  )
  returning id into v_quote_id;

  -- Insertar items (si vienen)
  if jsonb_typeof(p_items) = 'array' then
    for v_item in select * from jsonb_array_elements(p_items) loop
      if v_item ? 'description' and v_item ? 'amount' then
        insert into public.quote_items (quote_id, sort_order, description, amount)
        values (
          v_quote_id,
          v_order,
          trim(v_item->>'description'),
          (v_item->>'amount')::numeric
        );
        v_order := v_order + 1;
      end if;
    end loop;
  end if;

  -- Transición de estado en la request: sent -> quoted
  if v_request_status = 'sent' then
    update public.quote_requests set status = 'quoted' where id = p_request_id;
    insert into public.quote_request_status_history (quote_request_id, from_status, to_status, changed_by)
    values (p_request_id, 'sent', 'quoted', v_uid);
  end if;

  return v_quote_id;
end;
$$;

grant execute on function public.submit_quote(uuid, numeric, public.currency, text, date, text, numeric, jsonb) to authenticated;

-- ============================================================================
-- RPC: withdraw_quote
-- ============================================================================
create or replace function public.withdraw_quote(p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_operator_id uuid;
  v_status public.quote_status;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select operator_id, status into v_operator_id, v_status
  from public.quotes where id = p_quote_id;
  if not found then raise exception 'quote not found'; end if;
  if not public.is_operator_member(v_operator_id) then raise exception 'forbidden'; end if;
  if v_status <> 'submitted' then
    raise exception 'quote is % and cannot be withdrawn', v_status;
  end if;

  update public.quotes set status = 'withdrawn' where id = p_quote_id;
end;
$$;

grant execute on function public.withdraw_quote(uuid) to authenticated;
