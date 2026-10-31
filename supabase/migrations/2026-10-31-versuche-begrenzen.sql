-- Fehlversuche begrenzen, bevor die App öffentlich im Store steht.
--
-- Bisher ließen sich Stammtisch-Passwort (rpc_join_stammtisch) und die
-- 4-stellige Profil-PIN (rpc_verify_member_pin) beliebig oft durchprobieren;
-- eine PIN hat nur 10.000 Möglichkeiten. Jetzt gilt:
--   Beitreten: höchstens 10 Fehlversuche pro Gerät (auth.uid) und
--              30 pro Stammtisch-Name in 15 Minuten.
--   PIN:       höchstens 5 Fehlversuche pro Gerät und 10 pro Profil in 15 Minuten.
-- Danach antworten die Funktionen mit dem Fehler „zu_viele_versuche“, die App
-- zeigt dann einen Hinweis. Die Grenze pro Stammtisch bzw. Profil hält auch
-- Angriffe über viele neue anonyme Sitzungen auf.
--
-- Außerdem: Der Name wird nicht mehr mit ILIKE gesucht (dort wirkten „%“ und
-- „_“ als Platzhalter), sondern exakt ohne Groß-/Kleinschreibung – passend
-- zum eindeutigen Index auf lower(name).
--
-- Prod-Übernahme: „dev.“ durch „public.“ ersetzen. Die App kommt mit und
-- ohne diese Änderung zurecht.

create table if not exists dev.fehlversuche (
  art text not null,            -- 'beitritt' oder 'pin'
  ziel text not null,           -- Stammtisch-Name (klein) bzw. Mitglieds-Id
  auth_user_id uuid,
  zeit timestamptz not null default now()
);
create index if not exists fehlversuche_suche_idx on dev.fehlversuche (art, ziel, zeit);
create index if not exists fehlversuche_nutzer_idx on dev.fehlversuche (art, auth_user_id, zeit);
-- Nur die Funktionen unten (security definer) lesen und schreiben; keine Policy = kein Zugriff aus der App.
alter table dev.fehlversuche enable row level security;

create or replace function dev.fehlversuche_pruefen(p_art text, p_ziel text, p_max_nutzer int, p_max_ziel int)
returns void
language plpgsql
security definer
set search_path = dev, public
as $$
declare
  v_seit timestamptz := now() - interval '15 minutes';
begin
  -- Alte Einträge nebenbei aufräumen.
  delete from dev.fehlversuche where zeit < now() - interval '1 day';
  if (select count(*) from dev.fehlversuche where art = p_art and auth_user_id = auth.uid() and zeit > v_seit) >= p_max_nutzer
     or (select count(*) from dev.fehlversuche where art = p_art and ziel = p_ziel and zeit > v_seit) >= p_max_ziel then
    raise exception 'zu_viele_versuche' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function dev.fehlversuche_pruefen(text, text, int, int) from public, anon, authenticated;

create or replace function dev.rpc_join_stammtisch(p_name text, p_password_hash text)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = dev, public
as $$
declare
  v_row dev.stammtische%rowtype;
  v_ziel text := lower(trim(p_name));
begin
  perform dev.fehlversuche_pruefen('beitritt', v_ziel, 10, 30);
  select * into v_row from dev.stammtische s where lower(s.name) = v_ziel limit 1;
  if v_row.id is null or v_row.password_hash is null or v_row.password_hash <> p_password_hash then
    insert into dev.fehlversuche (art, ziel, auth_user_id) values ('beitritt', v_ziel, auth.uid());
    return;
  end if;
  insert into dev.stammtisch_access (auth_user_id, stammtisch_id)
  values (auth.uid(), v_row.id)
  on conflict do nothing;
  return query select v_row.id, v_row.name;
end;
$$;

create or replace function dev.rpc_verify_member_pin(p_member_id text, p_pin_hash text)
returns boolean
language plpgsql
security definer
set search_path = dev, public
as $$
declare
  v_hash text;
  v_stammtisch_id uuid;
begin
  perform dev.fehlversuche_pruefen('pin', p_member_id, 5, 10);
  select pin_hash, stammtisch_id into v_hash, v_stammtisch_id from dev.members where id = p_member_id;
  if v_stammtisch_id is null or v_stammtisch_id not in (
    select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid()
  ) then
    return false;
  end if;
  if v_hash is null or v_hash <> p_pin_hash then
    insert into dev.fehlversuche (art, ziel, auth_user_id) values ('pin', p_member_id, auth.uid());
    return false;
  end if;
  return true;
end;
$$;

grant execute on function dev.rpc_join_stammtisch(text, text) to anon, authenticated;
grant execute on function dev.rpc_verify_member_pin(text, text) to anon, authenticated;
