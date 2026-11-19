-- Release 1.10.0: alle Prod-Migrationen in einem Skript (Schema public).
-- Erzeugt aus den dev-Migrationen (Schema dev durch public ersetzt). Ausführen im Supabase
-- SQL Editor des Prod-Projekts, VOR dem Einreichen von 1.10.0.
-- Alles ergänzend (neue Spalten/Funktionen) – ältere App-Versionen laufen weiter.

begin;

-- ═══ 1/3 PayPal-Link pro Mitglied (2026-11-18-member-zahlungslink.sql) ═══
alter table public.members add column if not exists zahlungs_link text;

-- Nur https-Links zulassen (die App prüft das auch, siehe utils/zahlungslink.ts).
alter table public.members drop constraint if exists members_zahlungs_link_https;
alter table public.members add constraint members_zahlungs_link_https
  check (zahlungs_link is null or zahlungs_link like 'https://%');

-- ═══ 2/3 Strichliste (2026-11-19-strichliste.sql) ═══
alter table public.spiele add column if not exists art text not null default 'spiel';
alter table public.spiele drop constraint if exists spiele_art_check;
alter table public.spiele add constraint spiele_art_check check (art in ('spiel', 'strichliste'));

-- ═══ 3/3 Einladungscode (2026-11-19-einladungscode.sql) ═══
alter table public.stammtische add column if not exists einladungscode text;
create unique index if not exists stammtische_einladungscode_idx on public.stammtische (einladungscode);

-- Neuer Code: XXXX-XXXX aus 32 gut lesbaren Zeichen.
create or replace function public.neuer_einladungscode()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_zeichen constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
begin
  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(v_zeichen, (get_byte(v_bytes, i) % 32) + 1, 1);
      if i = 3 then v_code := v_code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.stammtische where einladungscode = v_code);
  end loop;
  return v_code;
end;
$$;
revoke all on function public.neuer_einladungscode() from public, anon, authenticated;

-- Bestehende Stammtische bekommen einen Code.
update public.stammtische set einladungscode = public.neuer_einladungscode() where einladungscode is null;

create or replace function public.hat_zugang(p_stammtisch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stammtisch_access
    where auth_user_id = auth.uid() and stammtisch_id = p_stammtisch_id
  );
$$;
revoke all on function public.hat_zugang(uuid) from public, anon, authenticated;

-- Code des eigenen Stammtischs (legt einen an, falls noch keiner da ist).
create or replace function public.rpc_einladungscode(p_stammtisch_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not public.hat_zugang(p_stammtisch_id) then
    raise exception 'kein Zugriff auf diesen Stammtisch';
  end if;
  select einladungscode into v_code from public.stammtische where id = p_stammtisch_id;
  if v_code is null then
    v_code := public.neuer_einladungscode();
    update public.stammtische set einladungscode = v_code where id = p_stammtisch_id;
  end if;
  return v_code;
end;
$$;

-- Neuer Code; der alte gilt danach nicht mehr.
create or replace function public.rpc_einladungscode_erneuern(p_stammtisch_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not public.hat_zugang(p_stammtisch_id) then
    raise exception 'kein Zugriff auf diesen Stammtisch';
  end if;
  v_code := public.neuer_einladungscode();
  update public.stammtische set einladungscode = v_code where id = p_stammtisch_id;
  return v_code;
end;
$$;

-- Beitreten per Code (statt Name und Passwort). Groß-/Kleinschreibung,
-- Leerzeichen und Bindestrich sind egal.
create or replace function public.rpc_join_per_code(p_code text)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_row public.stammtische%rowtype;
begin
  perform public.fehlversuche_pruefen('code', 'code', 10, 1000000);
  if length(v_code) = 8 then
    v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
    select * into v_row from public.stammtische s where s.einladungscode = v_code;
  end if;
  if v_row.id is null then
    insert into public.fehlversuche (art, ziel, auth_user_id) values ('code', 'code', auth.uid());
    return;
  end if;
  insert into public.stammtisch_access (auth_user_id, stammtisch_id)
  values (auth.uid(), v_row.id)
  on conflict do nothing;
  return query select v_row.id, v_row.name;
end;
$$;

-- Passwort ändern (die App berechnet den Hash wie beim Anlegen).
create or replace function public.rpc_passwort_aendern(p_stammtisch_id uuid, p_password_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.hat_zugang(p_stammtisch_id) then
    raise exception 'kein Zugriff auf diesen Stammtisch';
  end if;
  if p_password_hash is null or length(p_password_hash) <> 64 then
    raise exception 'ungültiges Passwort';
  end if;
  update public.stammtische set password_hash = p_password_hash where id = p_stammtisch_id;
end;
$$;

grant execute on function public.rpc_einladungscode(uuid) to authenticated;
grant execute on function public.rpc_einladungscode_erneuern(uuid) to authenticated;
grant execute on function public.rpc_join_per_code(text) to anon, authenticated;
grant execute on function public.rpc_passwort_aendern(uuid, text) to authenticated;

commit;

-- ═══ Prüfung (sollte drei Zeilen „ok“ bzw. eine Zahl > 0 liefern) ═══
select 'zahlungs_link' as was, count(*) as ok from information_schema.columns where table_schema = 'public' and table_name = 'members' and column_name = 'zahlungs_link'
union all select 'spiele.art', count(*) from information_schema.columns where table_schema = 'public' and table_name = 'spiele' and column_name = 'art'
union all select 'stammtische mit Code', count(*) from public.stammtische where einladungscode is not null;
