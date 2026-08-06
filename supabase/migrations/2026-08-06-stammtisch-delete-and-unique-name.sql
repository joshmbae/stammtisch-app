-- Zwei zusammenhängende Lücken vor der öffentlicheren Nutzung schließen:
-- 1) Stammtisch-Namen waren nicht eindeutig (rpc_join_stammtisch sucht per
--    "limit 1" ohne order by -> bei Namensdopplung mit unterschiedlichem
--    Passwort ist einer der beiden nicht mehr über den Namen erreichbar).
-- 2) Es gab keinen Weg, einen Stammtisch samt aller Daten wieder zu löschen
--    (nur clearAllData als Devtool, das die Tabellen-Zeile selbst behält).
--
-- VORHER PRÜFEN (gegen das Zielschema, dev oder public):
--   select name, count(*) from stammtische group by lower(name) having count(*) > 1;
-- Bei Treffern erst manuell umbenennen, sonst schlägt der unique index fehl.

create unique index if not exists stammtische_name_unique_idx on dev.stammtische (lower(name));

create or replace function dev.rpc_delete_stammtisch(p_stammtisch_id uuid, p_password_hash text)
returns boolean
language plpgsql
security definer
set search_path = dev, public
as $$
declare
  v_hash text;
  v_has_access boolean;
begin
  select exists(
    select 1 from dev.stammtisch_access
    where stammtisch_id = p_stammtisch_id and auth_user_id = auth.uid()
  ) into v_has_access;
  if not v_has_access then
    return false;
  end if;

  select password_hash into v_hash from dev.stammtische where id = p_stammtisch_id;
  if v_hash is null or v_hash <> p_password_hash then
    return false;
  end if;

  delete from dev.activity_log where stammtisch_id = p_stammtisch_id;
  delete from dev.protokolle where termin_id in (select id from dev.termine where stammtisch_id = p_stammtisch_id);
  delete from dev.kasse where stammtisch_id = p_stammtisch_id;
  delete from dev.straf_logs where member_id in (select id from dev.members where stammtisch_id = p_stammtisch_id);
  delete from dev.spiel_logs where member_id in (select id from dev.members where stammtisch_id = p_stammtisch_id);
  delete from dev.verspaetung_logs where member_id in (select id from dev.members where stammtisch_id = p_stammtisch_id);
  delete from dev.schock_logs where member_id in (select id from dev.members where stammtisch_id = p_stammtisch_id);
  delete from dev.wetten where member_id in (select id from dev.members where stammtisch_id = p_stammtisch_id);
  delete from dev.spiel_ereignis_typen where spiel_id in (select id from dev.spiele where stammtisch_id = p_stammtisch_id);
  delete from dev.spiele where stammtisch_id = p_stammtisch_id;
  delete from dev.termine where stammtisch_id = p_stammtisch_id;
  delete from dev.members where stammtisch_id = p_stammtisch_id;
  delete from dev.stammtisch_access where stammtisch_id = p_stammtisch_id;
  delete from dev.verordnung where stammtisch_id = p_stammtisch_id;
  delete from dev.stammtische where id = p_stammtisch_id;

  return true;
end;
$$;

grant execute on function dev.rpc_delete_stammtisch(uuid, text) to anon, authenticated;
