-- Scope-a los relays cross-tenant (emails y notifs) a un request_id específico.
-- Antes: una agencia linkeada al operador X podía mandar notifs/emails sobre
-- TODA la actividad del operador X. Ahora cada caller declara el request al
-- que está respondiendo y la RPC valida la relación a nivel de ese request.

drop function if exists public.relayed_agency_member_emails(uuid);
drop function if exists public.relayed_operator_member_emails(uuid);
drop function if exists public.notify_agency_members(uuid, text, text, text, text);
drop function if exists public.notify_operator_members(uuid, text, text, text, text);

create or replace function public.relayed_agency_member_emails(
  p_agency_id uuid,
  p_request_id uuid
) returns text[]
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_emails text[];
begin
  if p_request_id is null then
    raise exception 'request_id required';
  end if;

  if not exists (
    select 1 from public.quote_requests r
    where r.id = p_request_id and r.agency_id = p_agency_id
  ) then
    raise exception 'request not in agency';
  end if;

  -- Caller debe ser miembro de la agencia, o un operador dispatched a ese
  -- request específico (no a cualquier request del agency).
  if not (
    public.is_agency_member(p_agency_id)
    or exists (
      select 1
      from public.quote_request_dispatches d
      join public.operator_members om on om.operator_id = d.operator_id
      where d.quote_request_id = p_request_id and om.user_id = auth.uid()
    )
  ) then
    raise exception 'not authorized';
  end if;

  select array_agg(distinct u.email::text) into v_emails
  from public.agency_members m
  join auth.users u on u.id = m.user_id
  where m.agency_id = p_agency_id and u.email is not null;

  return coalesce(v_emails, '{}');
end;
$$;

create or replace function public.relayed_operator_member_emails(
  p_operator_id uuid,
  p_request_id uuid
) returns text[]
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_emails text[];
begin
  if p_request_id is null then
    raise exception 'request_id required';
  end if;

  -- El request tiene que tener al operador dispatched.
  if not exists (
    select 1 from public.quote_request_dispatches d
    where d.quote_request_id = p_request_id and d.operator_id = p_operator_id
  ) then
    raise exception 'operator not dispatched to request';
  end if;

  -- Caller debe ser miembro del operador, o miembro de la agencia que dispatched.
  if not (
    public.is_operator_member(p_operator_id)
    or exists (
      select 1
      from public.quote_requests r
      join public.agency_members am on am.agency_id = r.agency_id
      where r.id = p_request_id and am.user_id = auth.uid()
    )
  ) then
    raise exception 'not authorized';
  end if;

  select array_agg(distinct u.email::text) into v_emails
  from public.operator_members m
  join auth.users u on u.id = m.user_id
  where m.operator_id = p_operator_id and u.email is not null;

  return coalesce(v_emails, '{}');
end;
$$;

grant execute on function public.relayed_agency_member_emails(uuid, uuid) to authenticated;
grant execute on function public.relayed_operator_member_emails(uuid, uuid) to authenticated;

-- notify_*_members ahora también requieren request_id para validar scope.
create or replace function public.notify_agency_members(
  p_agency_id uuid,
  p_request_id uuid,
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
  if p_request_id is null then
    raise exception 'request_id required';
  end if;

  if not exists (
    select 1 from public.quote_requests r
    where r.id = p_request_id and r.agency_id = p_agency_id
  ) then
    raise exception 'request not in agency';
  end if;

  if not (
    public.is_agency_member(p_agency_id)
    or exists (
      select 1 from public.quote_request_dispatches d
      join public.operator_members om on om.operator_id = d.operator_id
      where d.quote_request_id = p_request_id and om.user_id = auth.uid()
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
  p_request_id uuid,
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
  if p_request_id is null then
    raise exception 'request_id required';
  end if;

  if not exists (
    select 1 from public.quote_request_dispatches d
    where d.quote_request_id = p_request_id and d.operator_id = p_operator_id
  ) then
    raise exception 'operator not dispatched to request';
  end if;

  if not (
    public.is_operator_member(p_operator_id)
    or exists (
      select 1 from public.quote_requests r
      join public.agency_members am on am.agency_id = r.agency_id
      where r.id = p_request_id and am.user_id = auth.uid()
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

grant execute on function public.notify_agency_members(uuid, uuid, text, text, text, text) to authenticated;
grant execute on function public.notify_operator_members(uuid, uuid, text, text, text, text) to authenticated;
