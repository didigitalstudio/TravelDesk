-- TravelDesk — Iteración 1: tenancy base
-- Modela agencias y operadores como tenants separados con membership multi-usuario,
-- invitaciones por email y vinculación agencia↔operador.

create extension if not exists "citext";
create extension if not exists "pgcrypto";

-- ============================================================================
-- updated_at helper
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Tenants
-- ============================================================================
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  brand_color text,
  brand_logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_agencies_updated_at
before update on public.agencies
for each row execute function public.set_updated_at();

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  contact_email citext,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_operators_updated_at
before update on public.operators
for each row execute function public.set_updated_at();

-- ============================================================================
-- Memberships (un user puede pertenecer a múltiples agencias u operadores)
-- ============================================================================
create type public.member_role as enum ('owner', 'admin', 'member');

create table public.agency_members (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);

create index agency_members_user_idx on public.agency_members(user_id);

create table public.operator_members (
  operator_id uuid not null references public.operators(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (operator_id, user_id)
);

create index operator_members_user_idx on public.operator_members(user_id);

-- ============================================================================
-- Helper functions para RLS (security definer para evitar recursión)
-- ============================================================================
create or replace function public.is_agency_member(p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agency_members
    where agency_id = p_agency_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_agency_admin(p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agency_members
    where agency_id = p_agency_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_operator_member(p_operator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.operator_members
    where operator_id = p_operator_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_operator_admin(p_operator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.operator_members
    where operator_id = p_operator_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ============================================================================
-- Vinculación agencia↔operador (después de aceptar invitación)
-- ============================================================================
create table public.agency_operator_links (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (agency_id, operator_id)
);

create index agency_operator_links_operator_idx on public.agency_operator_links(operator_id);

-- ============================================================================
-- Invitaciones (email-based para members internos y para vincular operadores)
-- ============================================================================
create type public.invitation_kind as enum (
  'agency_member',     -- invitar a alguien a unirse a una agencia
  'operator_member',   -- invitar a alguien a unirse a un operador
  'operator_link'      -- agencia invita a un operador a vincularse
);

create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  kind public.invitation_kind not null,
  email citext not null,
  agency_id uuid references public.agencies(id) on delete cascade,
  operator_id uuid references public.operators(id) on delete cascade,
  role public.member_role,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status public.invitation_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invitations_origin_check check (
    (kind = 'agency_member'   and agency_id is not null  and operator_id is null) or
    (kind = 'operator_member' and operator_id is not null and agency_id is null) or
    (kind = 'operator_link'   and agency_id is not null  and operator_id is null)
  )
);

create index invitations_email_status_idx on public.invitations(email, status);
create index invitations_token_idx on public.invitations(token);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.agencies              enable row level security;
alter table public.operators             enable row level security;
alter table public.agency_members        enable row level security;
alter table public.operator_members      enable row level security;
alter table public.agency_operator_links enable row level security;
alter table public.invitations           enable row level security;

-- agencies
create policy "agencies_select_member"
on public.agencies for select
using (public.is_agency_member(id));

create policy "agencies_update_admin"
on public.agencies for update
using (public.is_agency_admin(id))
with check (public.is_agency_admin(id));

-- operators
create policy "operators_select_member"
on public.operators for select
using (public.is_operator_member(id));

create policy "operators_update_admin"
on public.operators for update
using (public.is_operator_admin(id))
with check (public.is_operator_admin(id));

-- Una agencia vinculada puede ver datos básicos del operador.
create policy "operators_select_linked_agency"
on public.operators for select
using (
  exists (
    select 1
    from public.agency_operator_links l
    where l.operator_id = operators.id
      and public.is_agency_member(l.agency_id)
  )
);

-- agency_members
create policy "agency_members_select_self_tenant"
on public.agency_members for select
using (public.is_agency_member(agency_id));

create policy "agency_members_admin_write"
on public.agency_members for all
using (public.is_agency_admin(agency_id))
with check (public.is_agency_admin(agency_id));

-- operator_members
create policy "operator_members_select_self_tenant"
on public.operator_members for select
using (public.is_operator_member(operator_id));

create policy "operator_members_admin_write"
on public.operator_members for all
using (public.is_operator_admin(operator_id))
with check (public.is_operator_admin(operator_id));

-- agency_operator_links
create policy "links_select_either_side"
on public.agency_operator_links for select
using (
  public.is_agency_member(agency_id) or public.is_operator_member(operator_id)
);

create policy "links_insert_agency_admin"
on public.agency_operator_links for insert
with check (public.is_agency_admin(agency_id));

create policy "links_delete_agency_admin"
on public.agency_operator_links for delete
using (public.is_agency_admin(agency_id));

-- invitations
create policy "invitations_select_origin_admin"
on public.invitations for select
using (
  (agency_id is not null and public.is_agency_admin(agency_id)) or
  (operator_id is not null and public.is_operator_admin(operator_id))
);

create policy "invitations_insert_origin_admin"
on public.invitations for insert
with check (
  (kind = 'agency_member'   and public.is_agency_admin(agency_id)) or
  (kind = 'operator_member' and public.is_operator_admin(operator_id)) or
  (kind = 'operator_link'   and public.is_agency_admin(agency_id))
);

create policy "invitations_update_origin_admin"
on public.invitations for update
using (
  (agency_id is not null and public.is_agency_admin(agency_id)) or
  (operator_id is not null and public.is_operator_admin(operator_id))
)
with check (
  (agency_id is not null and public.is_agency_admin(agency_id)) or
  (operator_id is not null and public.is_operator_admin(operator_id))
);

-- ============================================================================
-- RPCs (security definer) — onboarding y aceptación de invitaciones
-- ============================================================================

create or replace function public.create_agency(p_name text, p_slug citext)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.agencies(name, slug)
  values (p_name, p_slug)
  returning id into v_agency_id;

  insert into public.agency_members(agency_id, user_id, role)
  values (v_agency_id, v_uid, 'owner');

  return v_agency_id;
end;
$$;

create or replace function public.create_operator(p_name text, p_slug citext, p_contact_email citext default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_op_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.operators(name, slug, contact_email)
  values (p_name, p_slug, p_contact_email)
  returning id into v_op_id;

  insert into public.operator_members(operator_id, user_id, role)
  values (v_op_id, v_uid, 'owner');

  return v_op_id;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email citext;
  v_inv public.invitations;
  v_op_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select email into v_email from auth.users where id = v_uid;

  select * into v_inv from public.invitations where token = p_token;

  if not found then
    raise exception 'invitation not found';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'invitation is %', v_inv.status;
  end if;

  if v_inv.expires_at < now() then
    update public.invitations set status = 'expired' where id = v_inv.id;
    raise exception 'invitation expired';
  end if;

  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'invitation email does not match logged-in user';
  end if;

  if v_inv.kind = 'agency_member' then
    insert into public.agency_members(agency_id, user_id, role)
    values (v_inv.agency_id, v_uid, coalesce(v_inv.role, 'member'))
    on conflict (agency_id, user_id) do nothing;
  elsif v_inv.kind = 'operator_member' then
    insert into public.operator_members(operator_id, user_id, role)
    values (v_inv.operator_id, v_uid, coalesce(v_inv.role, 'member'))
    on conflict (operator_id, user_id) do nothing;
  elsif v_inv.kind = 'operator_link' then
    select om.operator_id into v_op_id
    from public.operator_members om
    where om.user_id = v_uid and om.role in ('owner','admin')
    limit 1;

    if v_op_id is null then
      raise exception 'user is not admin of any operator; create or join an operator first';
    end if;

    insert into public.agency_operator_links(agency_id, operator_id, created_by)
    values (v_inv.agency_id, v_op_id, v_uid)
    on conflict do nothing;
  end if;

  update public.invitations
  set status = 'accepted', accepted_at = now(), accepted_by = v_uid
  where id = v_inv.id;

  return jsonb_build_object(
    'kind', v_inv.kind,
    'agency_id', v_inv.agency_id,
    'operator_id', v_inv.operator_id
  );
end;
$$;

grant execute on function public.create_agency(text, citext) to authenticated;
grant execute on function public.create_operator(text, citext, citext) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
