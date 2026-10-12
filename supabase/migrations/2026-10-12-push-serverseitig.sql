-- Push-Versand serverseitig: Push-Tokens verlassen die Datenbank nicht mehr.
--
-- Bisher durfte jedes Gerät eines Stammtischs alle Push-Tokens der Gruppe
-- lesen und hat selbst an Expos Push-API gesendet. Jetzt:
-- - push_tokens ist für Clients komplett gesperrt (RLS an, keine Policy).
-- - Registrieren läuft über rpc_register_push_token.
-- - Senden läuft über rpc_send_push: die Funktion sucht die Tokens der
--   Empfänger (nur Mitglieder aus Stammtischen, auf die der Aufrufer Zugriff
--   hat) und schickt die Nachrichten per pg_net an Expo.
-- Texte baut weiterhin die App (utils/pushText.ts), die Funktion begrenzt
-- nur Länge und Empfängerzahl.
--
-- Prod-Übernahme: „dev.“ durch „public.“ ersetzen. Wichtig: Erst diese
-- Migration in public ausführen, dann die App-Version mit den RPCs
-- ausliefern. Ältere App-Versionen können danach keine Pushes mehr senden
-- (sie lesen die Tokens direkt).

create extension if not exists pg_net;

-- ─── Tabelle sperren ──────────────────────────────────────────────────────
drop policy if exists "stammtisch access via member" on dev.push_tokens;
alter table dev.push_tokens enable row level security;

-- ─── Registrieren ─────────────────────────────────────────────────────────
-- Ein Token pro Mitglied (unique member_id). Wechselt ein Gerät das Profil,
-- wird sein Token beim alten Mitglied entfernt, damit es nur noch Pushes für
-- das aktuelle Profil bekommt.
create or replace function dev.rpc_register_push_token(p_member_id text, p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = dev, public
as $$
begin
  if p_token is null or not (p_token like 'ExponentPushToken[%]' or p_token like 'ExpoPushToken[%]') then
    raise exception 'ungültiger Push-Token';
  end if;
  if not exists (
    select 1 from dev.members m
    where m.id = p_member_id
      and m.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
  ) then
    raise exception 'kein Zugriff auf dieses Mitglied';
  end if;

  delete from dev.push_tokens where token = p_token and member_id <> p_member_id;

  insert into dev.push_tokens (id, member_id, token, platform, updated_at)
  values (gen_random_uuid()::text, p_member_id, p_token, left(coalesce(p_platform, ''), 20), now())
  on conflict (member_id) do update
    set token = excluded.token, platform = excluded.platform, updated_at = now();
end;
$$;

-- ─── Senden ───────────────────────────────────────────────────────────────
-- Gibt zurück, an wie viele Geräte gesendet wurde (0 = keiner der Empfänger
-- hat ein Push-Gerät). Der Versand selbst läuft asynchron über pg_net.
create or replace function dev.rpc_send_push(
  p_empfaenger text[],
  p_title text,
  p_body text,
  p_subtitle text default null,
  p_data jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = dev, public
as $$
declare
  v_messages jsonb;
  v_count integer;
begin
  if p_empfaenger is null or cardinality(p_empfaenger) = 0 then
    return 0;
  end if;
  if cardinality(p_empfaenger) > 100 then
    raise exception 'zu viele Empfänger';
  end if;

  select
    coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'to', t.token,
      'title', left(p_title, 120),
      'subtitle', left(p_subtitle, 80),
      'body', left(p_body, 500),
      'sound', 'default',
      'data', coalesce(p_data, '{}'::jsonb)
    ))), '[]'::jsonb),
    count(*)
  into v_messages, v_count
  from dev.push_tokens t
  join dev.members m on m.id = t.member_id
  where t.member_id = any(p_empfaenger)
    and m.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid());

  if v_count = 0 then
    return 0;
  end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := v_messages,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
  );
  return v_count;
end;
$$;

revoke execute on function dev.rpc_register_push_token(text, text, text) from public;
revoke execute on function dev.rpc_send_push(text[], text, text, text, jsonb) from public;
grant execute on function dev.rpc_register_push_token(text, text, text) to authenticated;
grant execute on function dev.rpc_send_push(text[], text, text, text, jsonb) to authenticated;
