-- Alte Wett-Strafen (Stammtisch "die_hellen") in die selbst angelegte
-- Kategorie "Wette verloren" verschieben.
--
-- Hintergrund: 2026-09-01-wetten-entfernen.sql und
-- 2026-09-30-wetten-altbestand-textschluessel.sql haben die Strafen aus dem
-- entfernten Wetten-Feature auf "Sonstiges" umgehängt (Notiz-Präfix
-- "Verlorene Wette – …"). Die Runde hat inzwischen eine eigene, normale
-- Kategorie "Wette verloren" angelegt, die sich weiter manuell vergeben lässt.
--
-- Betroffen sind 11 Einträge: 9x "Verlorene Wette – …", "Fischwette" und
-- "Max Wetter auf Matthis …" (letzterer hatte noch den Rohtext 'sonstiges' als
-- Kategorie und wurde in der App ohne Label angezeigt). Betrag, Notiz und
-- beglichen bleiben unverändert.
--
-- Idempotent: nach dem Lauf zeigt keiner der Einträge mehr auf "Sonstiges"
-- bzw. den Rohtext.

update public.straf_logs sl
set kategorie = wette.id
from public.members m, public.stammtische s, public.straf_kategorien wette
where sl.member_id = m.id
  and s.id = m.stammtisch_id and s.name = 'die_hellen'
  and wette.stammtisch_id = s.id and wette.label = 'Wette verloren' and wette.system_key is null
  and sl.notiz ilike '%wett%'
  and (sl.kategorie = 'sonstiges'
       or sl.kategorie in (select id from public.straf_kategorien where stammtisch_id = s.id and system_key = 'sonstiges'));

-- Prüfabfrage (erwartet: 11 Einträge, 62 EUR):
--   select count(*), sum(sl.betrag) from public.straf_logs sl
--   join public.straf_kategorien k on k.id = sl.kategorie where k.label = 'Wette verloren';
