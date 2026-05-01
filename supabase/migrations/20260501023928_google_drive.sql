-- TravelDesk — Iteración 17: Google Drive integration
-- Cada agencia conecta su propio Drive vía OAuth. Guardamos refresh_token
-- y el id de la carpeta raíz. Las RPCs son security definer y validan
-- que el caller sea miembro/admin de la agencia.

create table public.agency_google_drive_connections (
  agency_id uuid primary key references public.agencies(id) on delete cascade,
  refresh_token text not null,
  drive_folder_id text,
  drive_folder_name text,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_drive_conn_updated_at
before update on public.agency_google_drive_connections
for each row execute function public.set_updated_at();

alter table public.agency_google_drive_connections enable row level security;

-- Sólo admins/owners de la agencia pueden ver/borrar la conexión.
create policy "drive_conn_select_admin"
  on public.agency_google_drive_connections for select
  using (public.is_agency_admin(agency_id));

create policy "drive_conn_delete_admin"
  on public.agency_google_drive_connections for delete
  using (public.is_agency_admin(agency_id));

-- Insert/update solo via RPCs (no policies abiertas).

-- Track de archivos sincronizados a Drive (para no duplicarlos).
create table public.attachment_drive_files (
  attachment_id uuid primary key references public.attachments(id) on delete cascade,
  drive_file_id text not null,
  drive_file_url text,
  synced_at timestamptz not null default now()
);

alter table public.attachment_drive_files enable row level security;

create policy "drive_files_select_agency"
  on public.attachment_drive_files for select
  using (
    exists (
      select 1 from public.attachments a
      where a.id = attachment_drive_files.attachment_id
        and public.is_agency_member(a.agency_id)
    )
  );

-- ============================================================================
-- RPCs
-- ============================================================================

create or replace function public.upsert_agency_drive_connection(
  p_agency_id uuid,
  p_refresh_token text,
  p_drive_folder_id text default null,
  p_drive_folder_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.is_agency_admin(p_agency_id) then raise exception 'forbidden: requires admin'; end if;
  if p_refresh_token is null or length(trim(p_refresh_token)) = 0 then
    raise exception 'refresh_token required';
  end if;

  insert into public.agency_google_drive_connections (
    agency_id, refresh_token, drive_folder_id, drive_folder_name, connected_by
  ) values (
    p_agency_id, p_refresh_token, p_drive_folder_id, p_drive_folder_name, v_uid
  )
  on conflict (agency_id) do update
    set refresh_token = excluded.refresh_token,
        drive_folder_id = coalesce(excluded.drive_folder_id, public.agency_google_drive_connections.drive_folder_id),
        drive_folder_name = coalesce(excluded.drive_folder_name, public.agency_google_drive_connections.drive_folder_name),
        connected_by = excluded.connected_by;
end;
$$;

grant execute on function public.upsert_agency_drive_connection(uuid, text, text, text) to authenticated;

create or replace function public.set_agency_drive_folder(
  p_agency_id uuid,
  p_folder_id text,
  p_folder_name text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_agency_admin(p_agency_id) then raise exception 'forbidden'; end if;
  update public.agency_google_drive_connections
    set drive_folder_id = p_folder_id,
        drive_folder_name = nullif(trim(p_folder_name), '')
    where agency_id = p_agency_id;
end;
$$;

grant execute on function public.set_agency_drive_folder(uuid, text, text) to authenticated;

create or replace function public.get_agency_drive_refresh_token(p_agency_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_token text;
begin
  if not public.is_agency_member(p_agency_id) then raise exception 'forbidden'; end if;
  select refresh_token into v_token
  from public.agency_google_drive_connections
  where agency_id = p_agency_id;
  return v_token;
end;
$$;

grant execute on function public.get_agency_drive_refresh_token(uuid) to authenticated;

create or replace function public.register_drive_sync(
  p_attachment_id uuid,
  p_drive_file_id text,
  p_drive_file_url text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_agency_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select agency_id into v_agency_id from public.attachments where id = p_attachment_id;
  if not public.is_agency_member(v_agency_id) then raise exception 'forbidden'; end if;
  insert into public.attachment_drive_files (attachment_id, drive_file_id, drive_file_url)
  values (p_attachment_id, p_drive_file_id, p_drive_file_url)
  on conflict (attachment_id) do update
    set drive_file_id = excluded.drive_file_id,
        drive_file_url = excluded.drive_file_url,
        synced_at = now();
end;
$$;

grant execute on function public.register_drive_sync(uuid, text, text) to authenticated;
