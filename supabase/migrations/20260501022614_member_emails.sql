-- TravelDesk — Iteración 12 (helpers): exponer emails de members al backend
-- vía RPCs security definer, para mandar mails desde server actions sin
-- necesitar service_role en Vercel.

-- Sólo devuelve la lista si el caller pertenece al tenant. Esto evita que
-- un member de una agencia X pueda hacer pesca de emails de otra agencia.

create or replace function public.agency_member_emails(p_agency_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select array_agg(distinct u.email::text)
  from public.agency_members m
  join auth.users u on u.id = m.user_id
  where m.agency_id = p_agency_id
    and u.email is not null
    and (
      public.is_agency_member(p_agency_id)
      or exists (
        select 1 from public.quote_request_dispatches d
        join public.quote_requests r on r.id = d.quote_request_id
        join public.operator_members om on om.operator_id = d.operator_id
        where r.agency_id = p_agency_id and om.user_id = auth.uid()
      )
    );
$$;

grant execute on function public.agency_member_emails(uuid) to authenticated;

create or replace function public.operator_member_emails(p_operator_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select array_agg(distinct u.email::text)
  from public.operator_members m
  join auth.users u on u.id = m.user_id
  where m.operator_id = p_operator_id
    and u.email is not null
    and (
      public.is_operator_member(p_operator_id)
      or exists (
        select 1 from public.agency_operator_links l
        join public.agency_members am on am.agency_id = l.agency_id
        where l.operator_id = p_operator_id and am.user_id = auth.uid()
      )
    );
$$;

grant execute on function public.operator_member_emails(uuid) to authenticated;
