-- TravelDesk — Iteración 18: notificaciones in-app
-- Una fila por user_id por evento. Se rellenan en paralelo a los mails.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications(user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

create policy "notifs_select_own"
  on public.notifications for select using (user_id = auth.uid());

create policy "notifs_update_own"
  on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- RPCs para encolar notificaciones cross-tenant.
-- Validan relación entre el caller y el tenant destino.
-- ============================================================================
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

grant execute on function public.notify_agency_members(uuid, text, text, text, text) to authenticated;

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

grant execute on function public.notify_operator_members(uuid, text, text, text, text) to authenticated;

create or replace function public.mark_notification_read(p_id uuid)
returns void language sql security definer set search_path = public
as $$
  update public.notifications
    set read_at = now()
    where id = p_id and user_id = auth.uid();
$$;

grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void language sql security definer set search_path = public
as $$
  update public.notifications
    set read_at = now()
    where user_id = auth.uid() and read_at is null;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;
