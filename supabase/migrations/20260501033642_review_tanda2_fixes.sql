-- TravelDesk — Review tanda 2: notify whitelist + payment_pending fix.

-- ============================================================================
-- A4 — notify_*_members validan p_kind contra whitelist conocida.
-- Esto evita que un caller comprometido inyecte spam con titles/bodies arbitrarios.
-- Si necesitamos un kind nuevo, hay que agregarlo acá.
-- ============================================================================
create or replace function public.is_valid_notification_kind(p_kind text)
returns boolean
language sql
immutable
as $$
  select p_kind in (
    'request_dispatched',
    'quote_submitted',
    'quote_accepted',
    'quote_rejected',
    'request_cancelled',
    'reservation_loaded',
    'request_issued',
    'payment_receipt_uploaded',
    'payment_verified',
    'invitation_received',
    'client_summary_generated'
  );
$$;

create or replace function public.notify_agency_members(
  p_agency_id uuid,
  p_kind text,
  p_title text,
  p_body text default null,
  p_link text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_valid_notification_kind(p_kind) then
    raise exception 'invalid notification kind: %', p_kind;
  end if;

  if not (
    public.is_agency_member(p_agency_id)
    or exists (
      select 1 from public.quote_request_dispatches d
      join public.quote_requests r on r.id = d.quote_request_id
      join public.operator_members om on om.operator_id = d.operator_id
      where r.agency_id = p_agency_id and om.user_id = auth.uid()
    )
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.notifications (user_id, kind, title, body, link)
  select user_id, p_kind, p_title, nullif(p_body, ''), nullif(p_link, '')
  from public.agency_members
  where agency_id = p_agency_id;
end;
$$;

create or replace function public.notify_operator_members(
  p_operator_id uuid,
  p_kind text,
  p_title text,
  p_body text default null,
  p_link text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_valid_notification_kind(p_kind) then
    raise exception 'invalid notification kind: %', p_kind;
  end if;

  if not (
    public.is_operator_member(p_operator_id)
    or exists (
      select 1 from public.agency_operator_links l
      join public.agency_members am on am.agency_id = l.agency_id
      where l.operator_id = p_operator_id and am.user_id = auth.uid()
    )
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.notifications (user_id, kind, title, body, link)
  select user_id, p_kind, p_title, nullif(p_body, ''), nullif(p_link, '')
  from public.operator_members
  where operator_id = p_operator_id;
end;
$$;
