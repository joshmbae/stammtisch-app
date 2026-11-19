-- SICHERHEIT: offene „public_all_*“-Policies entfernen.
--
-- Auf 15 Tabellen gab es (nicht über Migrationen, vermutlich aus der
-- Anfangszeit im Dashboard angelegt) Policies „public_all_<tabelle>“ für
-- anon und authenticated mit USING (true) / WITH CHECK (true) für ALLE
-- Operationen. Da Policies permissiv per ODER verknüpft werden, hebelten sie
-- die eigentlichen Zugriffsregeln („stammtisch access …“, siehe
-- 2026-08-02-rls-and-access-control.sql) komplett aus: Mit dem öffentlichen
-- anon-Key aus der App ließen sich alle Daten aller Stammtische lesen,
-- ändern und löschen – Mitglieder (Namen, Geburtstage), Strafen, Kasse,
-- Passwort-Hashes.
--
-- Danach gelten nur noch die Zugriffsregeln über stammtisch_access. Die App
-- nutzt ausschließlich diese Wege (Beitritt per rpc_join_stammtisch legt den
-- Zugang an). Tabellen ohne eigene Regel (bier_logs, chat_messages,
-- chat_sessions, erinnerungen) nutzt die App nicht mehr; sie sind danach für
-- Clients gesperrt.
--
-- Prod-Übernahme: „dev.“ durch „public.“ ersetzen. Vorher geprüft: Alle aktiven
-- Stammtische haben Zugangseinträge für ihre Geräte.

do $$
declare
  r record;
begin
  for r in
    select c.relname as tabelle, p.polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'dev' and p.polname like 'public_all_%'
  loop
    execute format('drop policy %I on dev.%I', r.polname, r.tabelle);
  end loop;
end $$;
