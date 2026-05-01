-- Permite a la agencia elegir cuáles attachments del operador se comparten
-- con el cliente final via /trip/[token]. Default false: nada se comparte
-- hasta que la agencia lo marque explícitamente.

alter table public.attachments
  add column if not exists shared_with_client boolean not null default false;

create index if not exists attachments_shared_idx
  on public.attachments(quote_request_id)
  where shared_with_client = true;

-- RPC: agencia toggle del flag. Solo kinds compartibles
-- (voucher, invoice, file_doc, reservation).
create or replace function public.set_attachment_shared(
  p_attachment_id uuid,
  p_shared boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
  v_kind public.attachment_kind;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select a.kind, r.agency_id into v_kind, v_agency_id
  from public.attachments a
  join public.quote_requests r on r.id = a.quote_request_id
  where a.id = p_attachment_id;
  if not found then raise exception 'attachment not found'; end if;

  if v_kind not in ('voucher', 'invoice', 'file_doc', 'reservation') then
    raise exception 'attachment kind % no se puede compartir', v_kind;
  end if;

  if not public.is_agency_member(v_agency_id) then
    raise exception 'forbidden';
  end if;

  update public.attachments
    set shared_with_client = p_shared
    where id = p_attachment_id;
end;
$$;

grant execute on function public.set_attachment_shared(uuid, boolean) to authenticated;

-- get_trip_summary ahora filtra por shared_with_client = true.
create or replace function public.get_trip_summary(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'request', jsonb_build_object(
      'code', r.code,
      'client_name', r.client_name,
      'destination', r.destination,
      'departure_date', r.departure_date,
      'return_date', r.return_date,
      'flexible_dates', r.flexible_dates,
      'pax_adults', r.pax_adults,
      'pax_children', r.pax_children,
      'pax_infants', r.pax_infants,
      'services', r.services,
      'status', r.status,
      'issued_at', r.issued_at,
      'created_at', r.created_at
    ),
    'agency', jsonb_build_object(
      'name', a.name,
      'brand_color', a.brand_color,
      'brand_logo_url', a.brand_logo_url
    ),
    'reservation', case when res.id is null then null else jsonb_build_object(
      'reservation_code', res.reservation_code,
      'operator_name', op.name
    ) end,
    'passengers', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'full_name', p.full_name,
          'passenger_type', p.passenger_type,
          'nationality', p.nationality
        ) order by p.created_at
      )
      from public.passengers p where p.quote_request_id = r.id),
      '[]'::jsonb
    ),
    'documents', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'id', a2.id,
          'file_name', a2.file_name,
          'kind', a2.kind,
          'size_bytes', a2.size_bytes
        ) order by a2.created_at desc
      )
      from public.attachments a2
      where a2.quote_request_id = r.id
        and a2.shared_with_client = true
        and a2.kind in ('voucher', 'invoice', 'file_doc', 'reservation')),
      '[]'::jsonb
    )
  )
  from public.quote_requests r
  join public.agencies a on a.id = r.agency_id
  left join public.reservations res on res.quote_request_id = r.id
  left join public.operators op on op.id = res.operator_id
  where r.client_summary_token = p_token;
$$;

-- get_trip_attachment_path: solo si está marcado como compartido.
create or replace function public.get_trip_attachment_path(
  p_token uuid,
  p_attachment_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a2.storage_path
  from public.attachments a2
  join public.quote_requests r on r.id = a2.quote_request_id
  where r.client_summary_token = p_token
    and a2.id = p_attachment_id
    and a2.shared_with_client = true
    and a2.kind in ('voucher', 'invoice', 'file_doc', 'reservation')
  limit 1;
$$;

-- Storage policy gate: ahora también requiere shared_with_client = true.
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
      and a.shared_with_client = true
      and a.kind in ('voucher', 'invoice', 'file_doc', 'reservation')
  );
$$;
