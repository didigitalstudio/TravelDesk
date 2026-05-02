-- TravelDesk — Bot de Telegram conversacional
-- Estado de conversación por-chat para el wizard de creación de solicitudes.

create table public.telegram_conversations (
  chat_id     bigint primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  step        text not null default 'idle',
  draft       jsonb not null default '{}'::jsonb,
  message_id  bigint,
  updated_at  timestamptz not null default now()
);

create index telegram_conversations_user_idx on public.telegram_conversations(user_id);

alter table public.telegram_conversations enable row level security;

create policy "telegram_conversations_select_own"
  on public.telegram_conversations for select
  using (user_id = auth.uid());

-- ============================================================================
-- RPC: obtener o crear estado de conversación.
-- Reset oportunista si lleva más de 30 min de inactividad.
-- ============================================================================
create or replace function public.telegram_conv_get(p_chat_id bigint)
returns table (r_step text, r_draft jsonb, r_message_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid;
  v_step     text;
  v_draft    jsonb;
  v_mid      bigint;
  v_updated  timestamptz;
begin
  select user_id into v_user_id
  from public.telegram_links where chat_id = p_chat_id;
  if v_user_id is null then
    raise exception 'chat not linked';
  end if;

  -- Insertar fila idle si es la primera vez
  insert into public.telegram_conversations (chat_id, user_id)
  values (p_chat_id, v_user_id)
  on conflict (chat_id) do nothing;

  select c.step, c.draft, c.message_id, c.updated_at
  into v_step, v_draft, v_mid, v_updated
  from public.telegram_conversations c
  where c.chat_id = p_chat_id;

  -- Reset oportunista si más de 30 min de inactividad y no estaba idle
  if v_step <> 'idle' and v_updated < now() - interval '30 minutes' then
    update public.telegram_conversations
    set step = 'idle', draft = '{}'::jsonb, message_id = null, updated_at = now()
    where chat_id = p_chat_id;
    return query select 'idle'::text, '{}'::jsonb, null::bigint;
    return;
  end if;

  return query select v_step, v_draft, v_mid;
end;
$$;

grant execute on function public.telegram_conv_get(bigint) to anon, authenticated;

-- ============================================================================
-- RPC: guardar estado de conversación (upsert atómico).
-- ============================================================================
create or replace function public.telegram_conv_set(
  p_chat_id   bigint,
  p_step      text,
  p_draft     jsonb,
  p_message_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.telegram_links where chat_id = p_chat_id;
  if v_user_id is null then
    raise exception 'chat not linked';
  end if;

  insert into public.telegram_conversations (chat_id, user_id, step, draft, message_id, updated_at)
  values (p_chat_id, v_user_id, p_step, coalesce(p_draft, '{}'::jsonb), p_message_id, now())
  on conflict (chat_id) do update
    set step       = excluded.step,
        draft      = excluded.draft,
        message_id = excluded.message_id,
        updated_at = now();
end;
$$;

grant execute on function public.telegram_conv_set(bigint, text, jsonb, bigint) to anon, authenticated;

-- ============================================================================
-- RPC: resetear conversación a idle.
-- ============================================================================
create or replace function public.telegram_conv_reset(p_chat_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.telegram_conversations
  set step = 'idle', draft = '{}'::jsonb, message_id = null, updated_at = now()
  where chat_id = p_chat_id;
$$;

grant execute on function public.telegram_conv_reset(bigint) to anon, authenticated;
