-- Drop el overload viejo de update_quote_request (sin p_client_id) para que
-- quede solo la versión con CRM. PostgreSQL distingue funciones por signature.

drop function if exists public.update_quote_request(
  uuid, text, text, integer, integer, integer, public.service_type[], citext, text,
  date, date, boolean, text
);
