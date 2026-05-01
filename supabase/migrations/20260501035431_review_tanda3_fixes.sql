-- TravelDesk — Review tanda 3: medios.

-- ============================================================================
-- M2 — notify_*_members deduplican por user: si el user ya tiene una notif
-- idéntica (mismo kind + link) sin leer en el último minuto, no insertamos
-- otra. Esto cubre el caso de un user que es member de 2 operators dispatched
-- a la misma request → recibía 2 notifs idénticas.
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
  select m.user_id, p_kind, p_title, nullif(p_body, ''), nullif(p_link, '')
  from public.agency_members m
  where m.agency_id = p_agency_id
    and not exists (
      select 1 from public.notifications n
      where n.user_id = m.user_id
        and n.kind = p_kind
        and n.link is not distinct from nullif(p_link, '')
        and n.read_at is null
        and n.created_at > now() - interval '1 minute'
    );
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
  select m.user_id, p_kind, p_title, nullif(p_body, ''), nullif(p_link, '')
  from public.operator_members m
  where m.operator_id = p_operator_id
    and not exists (
      select 1 from public.notifications n
      where n.user_id = m.user_id
        and n.kind = p_kind
        and n.link is not distinct from nullif(p_link, '')
        and n.read_at is null
        and n.created_at > now() - interval '1 minute'
    );
end;
$$;
