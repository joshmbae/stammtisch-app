-- Einladungscode: zweiter Weg in einen Stammtisch, ohne das Passwort.
--
-- Problem: Wer das Stammtisch-Passwort vergisst (neues Handy, App neu
-- installiert), kommt nicht mehr rein – gespeichert ist nur ein Hash.
-- Lösung: Jeder Stammtisch hat einen Einladungscode (z. B. „K7MP-Q4RX“), den
-- alle Mitglieder in der App sehen und weitergeben können. Admins können ihn
-- erneuern (alte Codes gelten dann nicht mehr) und das Passwort ändern.
--
-- Sicherheit:
-- - 8 Zeichen aus 32 (ohne 0/O/1/I) ≈ 10^12 Möglichkeiten, kryptografisch
--   zufällig (gen_random_bytes).
-- - Beitritt per Code ist wie der per Passwort begrenzt: 10 Fehlversuche pro
--   Gerät in 15 Minuten (fehlversuche_pruefen aus 2026-10-31).
-- - Code lesen, erneuern und Passwort ändern nur mit Zugang zum Stammtisch
--   (stammtisch_access). Dass nur Admins erneuern/ändern, regelt die App –
--   Admin ist ein Profil-Merkmal, kein Merkmal des Geräts.
--
-- Prod-Übernahme: „dev.“ durch „public.“ ersetzen, vor der App-Version
-- ausführen, die den Code anbietet.

alter table dev.stammtische add column if not exists einladungscode text;
create unique index if not exists stammtische_einladungscode_idx on dev.stammtische (einladungscode);

-- Neuer Code: XXXX-XXXX aus 32 gut lesbaren Zeichen.
create or replace function dev.neuer_einladungscode()
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
    exit when not exists (select 1 from dev.stammtische where einladungscode = v_code);
  end loop;
  return v_code;
end;
$$;
revoke all on function dev.neuer_einladungscode() from public, anon, authenticated;

-- Bestehende Stammtische bekommen einen Code.
update dev.stammtische set einladungscode = dev.neuer_einladungscode() where einladungscode is null;

create or replace function dev.hat_zugang(p_stammtisch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from dev.stammtisch_access
    where auth_user_id = auth.uid() and stammtisch_id = p_stammtisch_id
  );
$$;
revoke all on function dev.hat_zugang(uuid) from public, anon, authenticated;

-- Code des eigenen Stammtischs (legt einen an, falls noch keiner da ist).
create or replace function dev.rpc_einladungscode(p_stammtisch_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not dev.hat_zugang(p_stammtisch_id) then
    raise exception 'kein Zugriff auf diesen Stammtisch';
  end if;
  select einladungscode into v_code from dev.stammtische where id = p_stammtisch_id;
  if v_code is null then
    v_code := dev.neuer_einladungscode();
    update dev.stammtische set einladungscode = v_code where id = p_stammtisch_id;
  end if;
  return v_code;
end;
$$;

-- Neuer Code; der alte gilt danach nicht mehr.
create or replace function dev.rpc_einladungscode_erneuern(p_stammtisch_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not dev.hat_zugang(p_stammtisch_id) then
    raise exception 'kein Zugriff auf diesen Stammtisch';
  end if;
  v_code := dev.neuer_einladungscode();
  update dev.stammtische set einladungscode = v_code where id = p_stammtisch_id;
  return v_code;
end;
$$;

-- Beitreten per Code (statt Name und Passwort). Groß-/Kleinschreibung,
-- Leerzeichen und Bindestrich sind egal.
create or replace function dev.rpc_join_per_code(p_code text)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_row dev.stammtische%rowtype;
begin
  perform dev.fehlversuche_pruefen('code', 'code', 10, 1000000);
  if length(v_code) = 8 then
    v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
    select * into v_row from dev.stammtische s where s.einladungscode = v_code;
  end if;
  if v_row.id is null then
    insert into dev.fehlversuche (art, ziel, auth_user_id) values ('code', 'code', auth.uid());
    return;
  end if;
  insert into dev.stammtisch_access (auth_user_id, stammtisch_id)
  values (auth.uid(), v_row.id)
  on conflict do nothing;
  return query select v_row.id, v_row.name;
end;
$$;

-- Passwort ändern (die App berechnet den Hash wie beim Anlegen).
create or replace function dev.rpc_passwort_aendern(p_stammtisch_id uuid, p_password_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not dev.hat_zugang(p_stammtisch_id) then
    raise exception 'kein Zugriff auf diesen Stammtisch';
  end if;
  if p_password_hash is null or length(p_password_hash) <> 64 then
    raise exception 'ungültiges Passwort';
  end if;
  update dev.stammtische set password_hash = p_password_hash where id = p_stammtisch_id;
end;
$$;

grant execute on function dev.rpc_einladungscode(uuid) to authenticated;
grant execute on function dev.rpc_einladungscode_erneuern(uuid) to authenticated;
grant execute on function dev.rpc_join_per_code(text) to anon, authenticated;
grant execute on function dev.rpc_passwort_aendern(uuid, text) to authenticated;
