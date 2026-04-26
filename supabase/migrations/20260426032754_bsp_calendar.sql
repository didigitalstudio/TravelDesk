-- TravelDesk — Iteración 10: vencimiento BSP
-- Calendario IATA BSP Argentina 2026 (48 períodos quincenales). Cuando una request
-- con servicio 'flights' se marca como emitida, calculamos su bsp_due_date buscando
-- el período donde cae issued_at::date y devolviendo el día de pago de ese período.

create table public.bsp_calendar (
  period_code text primary key,
  period_from date not null,
  period_to date not null,
  payment_date date not null,
  check (period_to >= period_from),
  check (payment_date > period_to)
);

create index bsp_calendar_period_range_idx
  on public.bsp_calendar (period_from, period_to);

alter table public.bsp_calendar enable row level security;

-- Data pública de referencia: cualquier usuario autenticado puede leerla.
create policy "bsp_calendar select for authenticated"
  on public.bsp_calendar for select
  to authenticated
  using (true);

insert into public.bsp_calendar (period_code, period_from, period_to, payment_date) values
  ('20260101W', '2026-01-01', '2026-01-07', '2026-01-12'),
  ('20260102W', '2026-01-08', '2026-01-15', '2026-01-20'),
  ('20260103W', '2026-01-16', '2026-01-22', '2026-01-27'),
  ('20260104W', '2026-01-23', '2026-01-31', '2026-02-04'),
  ('20260201W', '2026-02-01', '2026-02-07', '2026-02-11'),
  ('20260202W', '2026-02-08', '2026-02-15', '2026-02-20'),
  ('20260203W', '2026-02-16', '2026-02-22', '2026-02-26'),
  ('20260204W', '2026-02-23', '2026-02-28', '2026-03-04'),
  ('20260301W', '2026-03-01', '2026-03-07', '2026-03-11'),
  ('20260302W', '2026-03-08', '2026-03-15', '2026-03-17'),
  ('20260303W', '2026-03-16', '2026-03-22', '2026-03-26'),
  ('20260304W', '2026-03-23', '2026-03-31', '2026-04-07'),
  ('20260401W', '2026-04-01', '2026-04-07', '2026-04-10'),
  ('20260402W', '2026-04-08', '2026-04-15', '2026-04-20'),
  ('20260403W', '2026-04-16', '2026-04-22', '2026-04-27'),
  ('20260404W', '2026-04-23', '2026-04-30', '2026-05-06'),
  ('20260501W', '2026-05-01', '2026-05-07', '2026-05-12'),
  ('20260502W', '2026-05-08', '2026-05-15', '2026-05-20'),
  ('20260503W', '2026-05-16', '2026-05-22', '2026-05-28'),
  ('20260504W', '2026-05-23', '2026-05-31', '2026-06-04'),
  ('20260601W', '2026-06-01', '2026-06-07', '2026-06-10'),
  ('20260602W', '2026-06-08', '2026-06-15', '2026-06-19'),
  ('20260603W', '2026-06-16', '2026-06-22', '2026-06-26'),
  ('20260604W', '2026-06-23', '2026-06-30', '2026-07-06'),
  ('20260701W', '2026-07-01', '2026-07-07', '2026-07-13'),
  ('20260702W', '2026-07-08', '2026-07-15', '2026-07-20'),
  ('20260703W', '2026-07-16', '2026-07-22', '2026-07-27'),
  ('20260704W', '2026-07-23', '2026-07-31', '2026-08-05'),
  ('20260801W', '2026-08-01', '2026-08-07', '2026-08-12'),
  ('20260802W', '2026-08-08', '2026-08-15', '2026-08-20'),
  ('20260803W', '2026-08-16', '2026-08-22', '2026-08-26'),
  ('20260804W', '2026-08-23', '2026-08-31', '2026-09-04'),
  ('20260901W', '2026-09-01', '2026-09-07', '2026-09-11'),
  ('20260902W', '2026-09-08', '2026-09-15', '2026-09-21'),
  ('20260903W', '2026-09-16', '2026-09-22', '2026-09-28'),
  ('20260904W', '2026-09-23', '2026-09-30', '2026-10-05'),
  ('20261001W', '2026-10-01', '2026-10-07', '2026-10-13'),
  ('20261002W', '2026-10-08', '2026-10-15', '2026-10-20'),
  ('20261003W', '2026-10-16', '2026-10-22', '2026-10-27'),
  ('20261004W', '2026-10-23', '2026-10-31', '2026-11-05'),
  ('20261101W', '2026-11-01', '2026-11-07', '2026-11-11'),
  ('20261102W', '2026-11-08', '2026-11-15', '2026-11-18'),
  ('20261103W', '2026-11-16', '2026-11-22', '2026-11-26'),
  ('20261104W', '2026-11-23', '2026-11-30', '2026-12-04'),
  ('20261201W', '2026-12-01', '2026-12-07', '2026-12-11'),
  ('20261202W', '2026-12-08', '2026-12-15', '2026-12-18'),
  ('20261203W', '2026-12-16', '2026-12-22', '2026-12-28'),
  ('20261204W', '2026-12-23', '2026-12-31', '2027-01-06');

-- ============================================================================
-- quote_requests.bsp_due_date
-- ============================================================================
alter table public.quote_requests
  add column bsp_due_date date;

-- Lookup helper (usable manualmente y desde el trigger).
create or replace function public.compute_bsp_due_date(p_issued_at_date date)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select payment_date
  from public.bsp_calendar
  where p_issued_at_date between period_from and period_to
  limit 1;
$$;

grant execute on function public.compute_bsp_due_date(date) to authenticated;

-- Trigger: cuando issued_at pasa de NULL a un timestamp y la request incluye
-- 'flights', resolvemos bsp_due_date desde el calendario. Si la fecha cae
-- fuera del rango cargado (ej. 2027), bsp_due_date queda NULL.
create or replace function public.set_bsp_due_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.issued_at is not null
     and (old.issued_at is null or old.issued_at is distinct from new.issued_at)
     and new.services @> array['flights']::service_type[]
  then
    new.bsp_due_date := public.compute_bsp_due_date((new.issued_at at time zone 'America/Argentina/Buenos_Aires')::date);
  end if;
  return new;
end;
$$;

create trigger quote_requests_set_bsp_due_date
  before update on public.quote_requests
  for each row
  execute function public.set_bsp_due_date();
