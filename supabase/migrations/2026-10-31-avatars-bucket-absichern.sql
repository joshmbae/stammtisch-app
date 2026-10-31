-- Bilder-Bucket „avatars“ absichern, bevor die App öffentlich im Store steht.
--
-- WICHTIG: Storage ist für dev und Prod derselbe. Diese Datei wirkt also
-- sofort auf beide Schemas – nicht „erst dev, dann public“ ausführen, sondern
-- einmal, wie sie ist. Die Hilfsfunktion prüft beide Schemas.
--
-- Problem bisher: Neben der Upload-Regel aus 2026-08-02 gab es (im Dashboard
-- angelegt) die Regeln avatars_public_read / _write / _update / _delete für
-- anon und authenticated ohne weitere Bedingung. Damit konnte jede:r mit dem
-- öffentlichen App-Schlüssel alle Bilder aller Stammtische auflisten,
-- überschreiben und löschen.
--
-- Neu:
--   Lesen per öffentlicher URL bleibt (Bucket ist public, dafür braucht es
--   keine Regel). Über die API sieht man nur noch Bilder des eigenen
--   Stammtischs und verwaiste – nicht mehr alle.
--   Hochladen: nur mit Sitzung (auch anonym) – wie bisher „avatars upload“.
--   Die App lädt seit 1.8.0 ohne upsert hoch, braucht also kein Update.
--   Löschen: nur, wenn das Bild nicht zu einem fremden Stammtisch gehört.
--   Bilder des eigenen Stammtischs und verwaiste Bilder (Mitglied, Termin
--   oder Stammtisch schon gelöscht) dürfen weg.
--
-- Pfade (utils/storage.ts):
--   <memberId>_<zeit>.<ext>
--   termin-bild_<terminId>_<zeit>.<ext>
--   stammtisch-logo_<stammtischId>_<zeit>.<ext>
--
-- Nach dem Ausführen in der App testen: Profilfoto, Terminfoto und Logo
-- hochladen, ersetzen und entfernen.

create or replace function public.avatars_bild_fremd(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id text;
  v_stammtisch uuid;
begin
  if p_name like 'termin-bild\_%' then
    v_id := substring(p_name from '^termin-bild_(.+)_[0-9]+\.[A-Za-z0-9]+$');
    select stammtisch_id into v_stammtisch from public.termine where id::text = v_id;
    if v_stammtisch is null then select stammtisch_id into v_stammtisch from dev.termine where id::text = v_id; end if;
  elsif p_name like 'stammtisch-logo\_%' then
    v_id := substring(p_name from '^stammtisch-logo_(.+)_[0-9]+\.[A-Za-z0-9]+$');
    select id into v_stammtisch from public.stammtische where id::text = v_id;
    if v_stammtisch is null then select id into v_stammtisch from dev.stammtische where id::text = v_id; end if;
  else
    v_id := substring(p_name from '^(.+)_[0-9]+\.[A-Za-z0-9]+$');
    select stammtisch_id into v_stammtisch from public.members where id::text = v_id;
    if v_stammtisch is null then select stammtisch_id into v_stammtisch from dev.members where id::text = v_id; end if;
  end if;

  -- Nicht (mehr) zugeordnet: verwaist, darf weg.
  if v_stammtisch is null then
    return false;
  end if;
  return not exists (
    select 1 from public.stammtisch_access where stammtisch_id = v_stammtisch and auth_user_id = auth.uid()
    union all
    select 1 from dev.stammtisch_access where stammtisch_id = v_stammtisch and auth_user_id = auth.uid()
  );
end;
$$;
revoke all on function public.avatars_bild_fremd(text) from public;
grant execute on function public.avatars_bild_fremd(text) to authenticated;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_public_write" on storage.objects;
drop policy if exists "avatars_public_update" on storage.objects;
drop policy if exists "avatars_public_delete" on storage.objects;

-- Hochladen: bleibt „avatars upload“ (authenticated, nur dieser Bucket).

drop policy if exists "avatars delete" on storage.objects;
create policy "avatars delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and not public.avatars_bild_fremd(name));

-- remove() der Storage-API braucht zusätzlich Lesen auf die Zeile. Gleiche
-- Bedingung: nur eigene Stammtisch-Bilder und verwaiste.
drop policy if exists "avatars select" on storage.objects;
create policy "avatars select" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and not public.avatars_bild_fremd(name));
