-- Nachzügler zur Wetten-Entfernung (siehe 2026-09-01-wetten-entfernen.sql).
--
-- Jene Migration ordnet Strafen über `sl.kategorie = alt.id` um, trifft also
-- nur Einträge, deren `kategorie` auf eine Zeile in `straf_kategorien` zeigt.
-- Aus der Zeit vor dem Umbau auf eigene Kategorie-Zeilen (siehe
-- 2026-08-30-straf-kategorien.sql) gibt es aber noch Strafen, bei denen in
-- `kategorie` direkt der Textschlüssel steht — z. B. wörtlich
-- 'wette_verloren'. Die blieben unangetastet und wurden in der App ohne
-- lesbares Label angezeigt.
--
-- In Prod waren das am 30.09.2026 fünf Einträge, alle im Stammtisch
-- "die_hellen". Sie werden nach derselben Regel behandelt wie die anderen:
-- Kategorie auf "Sonstiges", Herkunft bleibt in der Notiz erhalten.
--
-- ACHTUNG: nicht idempotent — der Notiz-Präfix würde sich sonst doppeln.

update dev.straf_logs sl
set kategorie = sonstiges.id,
    notiz = 'Verlorene Wette' || case when sl.notiz is not null then ' – ' || sl.notiz else '' end
from dev.members m, dev.straf_kategorien sonstiges
where sl.member_id = m.id
  and sl.kategorie = 'wette_verloren'
  and sonstiges.stammtisch_id = m.stammtisch_id
  and sonstiges.system_key = 'sonstiges';

-- OFFEN (bewusst nicht Teil dieser Migration): Es gibt weitere Strafen mit
-- Textschlüsseln statt Zeilen-Verweis, die nichts mit Wetten zu tun haben —
-- in Prod drei mit 'fehlen_entschuldigt' und eine mit 'sonstiges'. Wohin die
-- gehören, ist eine inhaltliche Entscheidung und kein reines Datenthema:
--   select sl.id, sl.kategorie, sl.betrag, sl.notiz
--   from public.straf_logs sl
--   left join public.straf_kategorien k on k.id = sl.kategorie
--   where k.id is null;
