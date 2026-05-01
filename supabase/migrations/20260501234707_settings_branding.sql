-- Bucket público para logos de marca de agencias y operadores.
-- Tamaño máximo 2MB, sólo imágenes. La URL pública vive en
-- agencies.brand_logo_url u operators.brand_logo_url.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública (signed por path implícito al ser bucket público).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'branding_public_read'
  ) then
    create policy "branding_public_read"
      on storage.objects for select
      using (bucket_id = 'branding');
  end if;
end $$;

-- Solo agency admin puede subir/borrar para su agencia.
-- Convención de path: agencies/{agency_id}/{filename}
-- Para operators: operators/{operator_id}/{filename}
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'branding_agency_write'
  ) then
    create policy "branding_agency_write"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'branding'
        and (storage.foldername(name))[1] = 'agencies'
        and public.is_agency_admin(((storage.foldername(name))[2])::uuid)
      );
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'branding_agency_delete'
  ) then
    create policy "branding_agency_delete"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'branding'
        and (storage.foldername(name))[1] = 'agencies'
        and public.is_agency_admin(((storage.foldername(name))[2])::uuid)
      );
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'branding_operator_write'
  ) then
    create policy "branding_operator_write"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'branding'
        and (storage.foldername(name))[1] = 'operators'
        and public.is_operator_admin(((storage.foldername(name))[2])::uuid)
      );
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'branding_operator_delete'
  ) then
    create policy "branding_operator_delete"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'branding'
        and (storage.foldername(name))[1] = 'operators'
        and public.is_operator_admin(((storage.foldername(name))[2])::uuid)
      );
  end if;
end $$;

-- ============================================================================
-- update_agency_profile: solo admin puede tocar nombre, color y logo URL.
-- Validamos formato del color y que la URL sea de Supabase Storage si no es null.
-- ============================================================================
create or replace function public.update_agency_profile(
  p_agency_id uuid,
  p_name text default null,
  p_brand_color text default null,
  p_brand_logo_url text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.is_agency_admin(p_agency_id) then
    raise exception 'forbidden: only admins can edit profile';
  end if;

  if p_name is not null then
    if length(trim(p_name)) < 2 or length(trim(p_name)) > 120 then
      raise exception 'USER: el nombre debe tener entre 2 y 120 caracteres';
    end if;
    update public.agencies set name = trim(p_name) where id = p_agency_id;
  end if;

  if p_brand_color is not null then
    if p_brand_color !~* '^#[0-9a-f]{6}$' then
      raise exception 'USER: color inválido (formato #RRGGBB)';
    end if;
    update public.agencies set brand_color = p_brand_color where id = p_agency_id;
  end if;

  -- Para limpiar el logo se pasa cadena vacía explícita.
  if p_brand_logo_url is not null then
    update public.agencies
      set brand_logo_url = nullif(p_brand_logo_url, '')
      where id = p_agency_id;
  end if;
end;
$$;

grant execute on function public.update_agency_profile(uuid, text, text, text) to authenticated;

-- ============================================================================
-- update_operator_profile: ídem para operadores.
-- ============================================================================
alter table public.operators
  add column if not exists brand_logo_url text,
  add column if not exists brand_color text;

alter table public.operators drop constraint if exists operators_brand_color_format;
alter table public.operators
  add constraint operators_brand_color_format
  check (brand_color is null or brand_color ~* '^#[0-9a-f]{6}$')
  not valid;

create or replace function public.update_operator_profile(
  p_operator_id uuid,
  p_name text default null,
  p_contact_email text default null,
  p_brand_color text default null,
  p_brand_logo_url text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.is_operator_admin(p_operator_id) then
    raise exception 'forbidden: only admins can edit profile';
  end if;

  if p_name is not null then
    if length(trim(p_name)) < 2 or length(trim(p_name)) > 120 then
      raise exception 'USER: el nombre debe tener entre 2 y 120 caracteres';
    end if;
    update public.operators set name = trim(p_name) where id = p_operator_id;
  end if;

  if p_contact_email is not null then
    update public.operators
      set contact_email = nullif(trim(p_contact_email), '')
      where id = p_operator_id;
  end if;

  if p_brand_color is not null then
    if p_brand_color !~* '^#[0-9a-f]{6}$' then
      raise exception 'USER: color inválido (formato #RRGGBB)';
    end if;
    update public.operators set brand_color = p_brand_color where id = p_operator_id;
  end if;

  if p_brand_logo_url is not null then
    update public.operators
      set brand_logo_url = nullif(p_brand_logo_url, '')
      where id = p_operator_id;
  end if;
end;
$$;

grant execute on function public.update_operator_profile(uuid, text, text, text, text) to authenticated;
