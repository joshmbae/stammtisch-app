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

-- Gleiches Muster ohne Wetten-Bezug: Strafen, deren `kategorie` den
-- Textschlüssel einer weiterhin existierenden Kategorie enthält, lassen sich
-- verlustfrei über `system_key` auflösen. In Prod betraf das drei Einträge
-- mit 'fehlen_entschuldigt' (Stammtisch "die_hellen", je 10 EUR) — Betrag und
-- Bezeichnung der Zielkategorie stimmten exakt überein.

update dev.straf_logs sl
set kategorie = k.id
from dev.members m, dev.straf_kategorien k
where sl.member_id = m.id
  and sl.kategorie = 'fehlen_entschuldigt'
  and k.stammtisch_id = m.stammtisch_id
  and k.system_key = 'fehlen_entschuldigt';

-- OFFEN (bewusst nicht Teil dieser Migration): In Prod bleibt ein Eintrag mit
-- dem Textschlüssel 'sonstiges' übrig (Stammtisch "die_hellen", 10 EUR, Notiz
-- "Max Wetter auf Matthis niedrig. Josh liefert"). Er liesse sich technisch
-- genauso auf die Sonstiges-Zeile umhaengen; ob der Eintrag inhaltlich dorthin
-- gehoert, ist eine Entscheidung der Runde:
--   select sl.id, sl.kategorie, sl.betrag, sl.notiz
--   from public.straf_logs sl
--   left join public.straf_kategorien k on k.id = sl.kategorie
--   where k.id is null;
