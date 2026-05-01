-- Permite que anon pueda crear signed URLs de attachments compartibles
-- (voucher, invoice, file_doc, reservation) cuando el request tiene un
-- client_summary_token activo. La RPC get_trip_attachment_path valida que
-- el attachment_id pertenezca al token específico antes de exponer el path,
-- así que el caller no puede listar paths arbitrarios.

create or replace function public.path_belongs_to_active_trip_summary(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.attachments a
    join public.quote_requests r on r.id = a.quote_request_id
    where a.storage_path = p_path
      and r.client_summary_token is not null
      and a.kind in ('voucher', 'invoice', 'file_doc', 'reservation')
  );
$$;

create policy "storage_attachments_select_trip_summary"
on storage.objects for select
using (
  bucket_id = 'attachments'
  and public.path_belongs_to_active_trip_summary(name)
);
