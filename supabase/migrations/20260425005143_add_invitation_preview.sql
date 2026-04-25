-- get_invitation_preview: lookup público (auth requerida) de los datos básicos de
-- una invitación por token. Permite mostrar la landing /invite/[token] sin
-- exponer toda la tabla invitations vía RLS.

create or replace function public.get_invitation_preview(p_token text)
returns table (
  kind public.invitation_kind,
  status public.invitation_status,
  email citext,
  expires_at timestamptz,
  agency_name text,
  operator_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.kind,
    i.status,
    i.email,
    i.expires_at,
    a.name as agency_name,
    o.name as operator_name
  from public.invitations i
  left join public.agencies  a on a.id = i.agency_id
  left join public.operators o on o.id = i.operator_id
  where i.token = p_token;
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;

-- pending_invitations_for_email: lista invitaciones pendientes (no expiradas)
-- para un email dado. Para mostrar invitaciones recibidas en el dashboard.
create or replace function public.pending_invitations_for_email(p_email citext)
returns table (
  id uuid,
  kind public.invitation_kind,
  email citext,
  token text,
  expires_at timestamptz,
  created_at timestamptz,
  agency_name text,
  operator_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.kind,
    i.email,
    i.token,
    i.expires_at,
    i.created_at,
    a.name as agency_name,
    o.name as operator_name
  from public.invitations i
  left join public.agencies  a on a.id = i.agency_id
  left join public.operators o on o.id = i.operator_id
  where lower(i.email) = lower(p_email)
    and i.status = 'pending'
    and i.expires_at > now();
$$;

grant execute on function public.pending_invitations_for_email(citext) to authenticated;

-- create_operator_link_invitation: helper para que una agencia cree una
-- invitación de tipo operator_link de forma segura (validando admin).
create or replace function public.create_operator_link_invitation(
  p_agency_id uuid,
  p_email citext
)
returns table (id uuid, token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_token text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_agency_admin(p_agency_id) then
    raise exception 'forbidden: not an admin of this agency';
  end if;

  insert into public.invitations(kind, email, agency_id, invited_by)
  values ('operator_link', p_email, p_agency_id, v_uid)
  returning invitations.id, invitations.token into v_id, v_token;

  return query select v_id, v_token;
end;
$$;

grant execute on function public.create_operator_link_invitation(uuid, citext) to authenticated;

-- revoke_invitation: el admin del tenant origen marca como revoked.
create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitations;
begin
  select * into v_inv from public.invitations where id = p_invitation_id;
  if not found then
    raise exception 'invitation not found';
  end if;

  if v_inv.agency_id is not null and not public.is_agency_admin(v_inv.agency_id) then
    raise exception 'forbidden';
  end if;
  if v_inv.operator_id is not null and not public.is_operator_admin(v_inv.operator_id) then
    raise exception 'forbidden';
  end if;

  update public.invitations set status = 'revoked' where id = p_invitation_id;
end;
$$;

grant execute on function public.revoke_invitation(uuid) to authenticated;
