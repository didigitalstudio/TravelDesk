-- TravelDesk — Iteración 11: cuenta corriente
-- Cuando una request se marca 'issued', creamos un payment row con el total
-- de los items aceptados de la quote ganadora. La agencia sube comprobantes
-- (kind=payment_receipt) y marca el pago como realizado → 'payment_pending'.
-- El operador verifica el comprobante → 'closed'.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null unique references public.quote_requests(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  currency public.currency not null,
  due_date date,
  receipt_uploaded_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create index payments_agency_idx on public.payments(agency_id);
create index payments_operator_idx on public.payments(operator_id);
create index payments_open_due_idx
  on public.payments(due_date)
  where due_date is not null and verified_at is null;

alter table public.payments enable row level security;

create policy "payments_select_agency"
  on public.payments for select
  using (public.is_agency_member(agency_id));

create policy "payments_select_operator"
  on public.payments for select
  using (public.is_operator_member(operator_id));

-- Sin policies de insert/update/delete: todo via RPCs con security definer.

-- ============================================================================
-- Trigger: crear payment cuando la request pasa a 'issued'
-- ============================================================================
create or replace function public.create_payment_on_issued()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_operator_id uuid;
  v_currency public.currency;
  v_amount numeric(14, 2);
begin
  select q.id, q.operator_id, q.currency
    into v_quote_id, v_operator_id, v_currency
  from public.quotes q
  where q.quote_request_id = new.id and q.status = 'accepted'
  limit 1;
  if v_quote_id is null then return new; end if;

  select coalesce(sum(amount), 0) into v_amount
  from public.quote_items
  where quote_id = v_quote_id and accepted_at is not null;
  if v_amount <= 0 then return new; end if;

  insert into public.payments (
    quote_request_id, agency_id, operator_id, amount, currency, due_date
  ) values (
    new.id, new.agency_id, v_operator_id, v_amount, v_currency, new.bsp_due_date
  )
  on conflict (quote_request_id) do nothing;

  return new;
end;
$$;

create trigger quote_requests_create_payment_on_issued
  after update on public.quote_requests
  for each row
  when (new.status = 'issued' and old.status is distinct from new.status)
  execute function public.create_payment_on_issued();

-- ============================================================================
-- Backfill: requests ya emitidas sin payment row
-- ============================================================================
do $$
declare
  r record;
  v_quote_id uuid;
  v_operator_id uuid;
  v_currency public.currency;
  v_amount numeric(14, 2);
begin
  for r in
    select qr.id, qr.agency_id, qr.bsp_due_date
    from public.quote_requests qr
    left join public.payments p on p.quote_request_id = qr.id
    where qr.status in ('issued', 'payment_pending', 'closed') and p.id is null
  loop
    select q.id, q.operator_id, q.currency
      into v_quote_id, v_operator_id, v_currency
    from public.quotes q
    where q.quote_request_id = r.id and q.status = 'accepted'
    limit 1;
    if v_quote_id is null then continue; end if;

    select coalesce(sum(amount), 0) into v_amount
    from public.quote_items
    where quote_id = v_quote_id and accepted_at is not null;
    if v_amount <= 0 then continue; end if;

    insert into public.payments (
      quote_request_id, agency_id, operator_id, amount, currency, due_date
    ) values (
      r.id, r.agency_id, v_operator_id, v_amount, v_currency, r.bsp_due_date
    );
  end loop;
end $$;

-- ============================================================================
-- RPC: register_payment_receipt
-- La agencia confirma que pagó (con al menos un comprobante subido).
-- Cambia request issued → payment_pending.
-- ============================================================================
create or replace function public.register_payment_receipt(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_request_status public.request_status;
  v_payment_id uuid;
  v_has_receipt boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select agency_id, status into v_agency_id, v_request_status
  from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_request_status not in ('issued', 'payment_pending') then
    raise exception 'request must be issued or payment_pending (current: %)', v_request_status;
  end if;

  select id into v_payment_id from public.payments where quote_request_id = p_request_id;
  if v_payment_id is null then raise exception 'payment row not found'; end if;

  select exists (
    select 1 from public.attachments
    where quote_request_id = p_request_id and kind = 'payment_receipt'
  ) into v_has_receipt;
  if not v_has_receipt then
    raise exception 'al menos un comprobante de pago debe estar subido';
  end if;

  update public.payments
    set receipt_uploaded_at = coalesce(receipt_uploaded_at, now())
    where id = v_payment_id;

  if v_request_status = 'issued' then
    update public.quote_requests set status = 'payment_pending' where id = p_request_id;
    insert into public.quote_request_status_history
      (quote_request_id, from_status, to_status, changed_by)
    values (p_request_id, 'issued', 'payment_pending', v_uid);
  end if;
end;
$$;

grant execute on function public.register_payment_receipt(uuid) to authenticated;

-- ============================================================================
-- RPC: verify_payment
-- El operador verifica el comprobante. Cambia request payment_pending → closed.
-- ============================================================================
create or replace function public.verify_payment(p_payment_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
  v_operator_id uuid;
  v_request_status public.request_status;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select quote_request_id, operator_id into v_request_id, v_operator_id
  from public.payments where id = p_payment_id;
  if not found then raise exception 'payment not found'; end if;
  if not public.is_operator_member(v_operator_id) then raise exception 'forbidden'; end if;

  select status into v_request_status from public.quote_requests where id = v_request_id;
  if v_request_status not in ('payment_pending', 'closed') then
    raise exception 'request must be payment_pending (current: %)', v_request_status;
  end if;

  update public.payments
    set verified_at = coalesce(verified_at, now()),
        verified_by = coalesce(verified_by, v_uid),
        notes = coalesce(nullif(trim(p_notes), ''), notes)
    where id = p_payment_id;

  if v_request_status = 'payment_pending' then
    update public.quote_requests set status = 'closed' where id = v_request_id;
    insert into public.quote_request_status_history
      (quote_request_id, from_status, to_status, changed_by, notes)
    values (v_request_id, 'payment_pending', 'closed', v_uid, nullif(trim(p_notes), ''));
  end if;
end;
$$;

grant execute on function public.verify_payment(uuid, text) to authenticated;

-- ============================================================================
-- RPC: unregister_payment_receipt
-- Si la agencia se equivocó y aún no verificaron, vuelve atrás.
-- ============================================================================
create or replace function public.unregister_payment_receipt(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_request_status public.request_status;
  v_verified boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select agency_id, status into v_agency_id, v_request_status
  from public.quote_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  if v_request_status <> 'payment_pending' then
    raise exception 'request not in payment_pending';
  end if;

  select verified_at is not null into v_verified
  from public.payments where quote_request_id = p_request_id;
  if v_verified then raise exception 'pago ya verificado por el operador'; end if;

  update public.payments
    set receipt_uploaded_at = null
    where quote_request_id = p_request_id;

  update public.quote_requests set status = 'issued' where id = p_request_id;
  insert into public.quote_request_status_history
    (quote_request_id, from_status, to_status, changed_by)
  values (p_request_id, 'payment_pending', 'issued', v_uid);
end;
$$;

grant execute on function public.unregister_payment_receipt(uuid) to authenticated;
