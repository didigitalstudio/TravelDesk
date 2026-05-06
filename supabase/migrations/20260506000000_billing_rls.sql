-- Habilita RLS en las tablas de billing creadas fuera del flujo de migraciones.
-- plans: catálogo, lectura para usuarios autenticados.
-- tenant_subscriptions: cada tenant ve su propia suscripción (lo que usan los layouts).
-- tenant_payments: lockeado para anon/authenticated; solo service_role (que bypassea RLS).

alter table public.plans enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.tenant_payments enable row level security;

drop policy if exists "plans_select_authenticated" on public.plans;
create policy "plans_select_authenticated"
on public.plans for select
to authenticated
using (true);

drop policy if exists "tenant_subscriptions_select_member" on public.tenant_subscriptions;
create policy "tenant_subscriptions_select_member"
on public.tenant_subscriptions for select
to authenticated
using (
  (tenant_type = 'agency' and public.is_agency_member(tenant_id))
  or (tenant_type = 'operator' and public.is_operator_member(tenant_id))
);
