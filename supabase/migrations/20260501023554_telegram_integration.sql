-- TravelDesk — Iteración 14: Bot de Telegram
-- Vincula chats de Telegram con users de Travel Desk.
-- Toda la lógica del bot pasa por RPCs security definer que validan
-- el chat_id, evitando exponer service_role en Vercel.

create table public.telegram_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_id bigint not null unique,
  username text,
  created_at timestamptz not null default now()
);

create index telegram_links_chat_id_idx on public.telegram_links(chat_id);

create table public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index telegram_link_codes_user_idx on public.telegram_link_codes(user_id);

alter table public.telegram_links enable row level security;
alter table public.telegram_link_codes enable row level security;

-- Sólo el dueño puede ver su propio link (lectura informativa desde la web).
create policy "telegram_links_select_own"
  on public.telegram_links for select
  using (user_id = auth.uid());

-- Codes: nadie debería leerlos directamente; todo via RPC.

-- ============================================================================
-- RPC: generar código de vinculación de 6 chars (callable desde la web)
-- ============================================================================
create or replace function public.generate_telegram_link_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  -- Loop hasta encontrar un code único (colisiones improbables a 6 chars).
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into public.telegram_link_codes (code, user_id, expires_at)
      values (v_code, v_uid, now() + interval '15 minutes');
      exit;
    exception when unique_violation then
      -- Reintenta
    end;
  end loop;
  -- Limpiá codes vencidos del user
  delete from public.telegram_link_codes
    where user_id = v_uid and expires_at < now() and code <> v_code;
  return v_code;
end;
$$;

grant execute on function public.generate_telegram_link_code() to authenticated;

-- ============================================================================
-- RPC: consumir código (llamado por el webhook con anon key)
-- Devuelve true si el code era válido, false si vencido/inexistente.
-- ============================================================================
create or replace function public.consume_telegram_link_code(
  p_code text,
  p_chat_id bigint,
  p_username text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  delete from public.telegram_link_codes
    where code = upper(trim(p_code))
      and expires_at > now()
    returning user_id into v_user_id;
  if v_user_id is null then return false; end if;

  -- Si el user ya tenía un link, lo reemplazamos
  insert into public.telegram_links (user_id, chat_id, username)
  values (v_user_id, p_chat_id, nullif(trim(p_username), ''))
  on conflict (user_id) do update
    set chat_id = excluded.chat_id,
        username = excluded.username,
        created_at = now();
  return true;
end;
$$;

grant execute on function public.consume_telegram_link_code(text, bigint, text) to anon, authenticated;

-- ============================================================================
-- RPC: crear quote_request desde Telegram
-- Resuelve user → primer agency_membership. Crea draft no enviado.
-- ============================================================================
create or replace function public.telegram_create_request(
  p_chat_id bigint,
  p_client_name text,
  p_destination text,
  p_notes text default null
)
returns table (request_id uuid, request_code text, agency_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_agency_id uuid;
  v_seq integer;
  v_code text;
  v_id uuid;
begin
  select user_id into v_user_id
  from public.telegram_links where chat_id = p_chat_id;
  if v_user_id is null then
    raise exception 'chat not linked';
  end if;

  select agency_id into v_agency_id
  from public.agency_members where user_id = v_user_id limit 1;
  if v_agency_id is null then
    raise exception 'user has no agency';
  end if;

  if p_client_name is null or length(trim(p_client_name)) = 0 then
    raise exception 'client_name required';
  end if;
  if p_destination is null or length(trim(p_destination)) = 0 then
    raise exception 'destination required';
  end if;

  update public.agencies
    set request_count = request_count + 1
    where id = v_agency_id
    returning request_count into v_seq;

  v_code := 'TD-' || lpad(v_seq::text, 4, '0');

  insert into public.quote_requests (
    agency_id, code, status, client_name, destination, notes, created_by
  ) values (
    v_agency_id, v_code, 'draft', trim(p_client_name), trim(p_destination),
    nullif(trim(p_notes), ''), v_user_id
  )
  returning id into v_id;

  insert into public.quote_request_status_history (quote_request_id, from_status, to_status, changed_by)
  values (v_id, null, 'draft', v_user_id);

  return query select v_id, v_code, v_agency_id;
end;
$$;

grant execute on function public.telegram_create_request(bigint, text, text, text) to anon, authenticated;

-- ============================================================================
-- RPC: listar últimas solicitudes del user de Telegram
-- ============================================================================
create or replace function public.telegram_list_recent_requests(p_chat_id bigint, p_limit integer default 5)
returns table (
  request_id uuid,
  request_code text,
  client_name text,
  destination text,
  status public.request_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_agency_id uuid;
begin
  select user_id into v_user_id
  from public.telegram_links where chat_id = p_chat_id;
  if v_user_id is null then return; end if;
  select agency_id into v_agency_id
  from public.agency_members where user_id = v_user_id limit 1;
  if v_agency_id is null then return; end if;

  return query
  select r.id, r.code, r.client_name, r.destination, r.status, r.created_at
  from public.quote_requests r
  where r.agency_id = v_agency_id
  order by r.created_at desc
  limit greatest(1, least(p_limit, 20));
end;
$$;

grant execute on function public.telegram_list_recent_requests(bigint, integer) to anon, authenticated;
