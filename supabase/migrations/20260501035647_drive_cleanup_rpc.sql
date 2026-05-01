-- M5 — al desconectar Drive, limpiar el track de archivos sincronizados de
-- esta agencia (los archivos en Drive del user siguen ahí, Drive es suyo).

create or replace function public.cleanup_drive_sync_records(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_agency_admin(p_agency_id) then raise exception 'forbidden'; end if;
  delete from public.attachment_drive_files
    where attachment_id in (
      select id from public.attachments where agency_id = p_agency_id
    );
end;
$$;

grant execute on function public.cleanup_drive_sync_records(uuid) to authenticated;
