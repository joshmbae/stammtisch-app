-- Strafen-Altbestand Jan–Jul 2026 nachtragen (Stammtisch "die_hellen").
--
-- Befund: Die Strafen vor dem 06.08.2026 (App-Start der Runde) wurden nie in
-- straf_logs erfasst — keine der Migrationen hat sie gelöscht. Die Grundlage
-- ist aber vorhanden und eindeutig:
--   * Fehlen: Mitglied war am Termin nicht in termine.anwesenheit
--     (alle 11 Mitglieder haben zu- oder abgesagt, also entschuldigt, 10 EUR,
--     Kategorie system_key 'fehlen_entschuldigt').
--   * Schock-Niederlage: spiel_logs mit Ereignistyp "Niederlage" ohne
--     straf_log_id (5 EUR, die am Ereignistyp hinterlegte Kategorie).
-- Nachgetragen werden nur Stammtische (art = 'stammtisch') vom 01.01.2026 bis
-- 31.07.2026. Aug/Sep sind bereits vollständig erfasst.
--
-- Die Einträge werden als beglichen angelegt und erzeugen bewusst KEINE
-- kasse-Einnahme: Der Kassenstand speist sich nur aus kasse-Einträgen, und die
-- Strafen davor sind im Startkapital ("Startkapital h2 2026") enthalten.
--
-- Nicht enthalten (Entscheidung der Runde): Verspätungsstrafen aus
-- verspaetung_logs (Jan 79 Min., Feb 8 Min., Mär 113 Min., Jun 7/4 Min.,
-- Jul 24/1 Min.) — ob entschuldigt oder nicht, lässt sich nicht ableiten.
--
-- Eine einzige Anweisung (CTEs), ohne temporäre Tabellen: der Supabase-SQL-Editor
-- führt Anweisungen teils in getrennten Verbindungen aus, Temp-Tabellen wären
-- dort schon wieder weg.
--
-- ACHTUNG: nicht idempotent — nicht zweimal ausführen (die Notiz
-- 'Nachgetragen (Altbestand)' markiert die Einträge, siehe Prüfabfrage unten).

with fehlen as materialized (
  select gen_random_uuid()::text as id, m.id as member_id, t.id as termin_id, t.datum, k.id as kategorie, k.betrag
  from public.termine t
  join public.stammtische s on s.id = t.stammtisch_id and s.name = 'die_hellen'
  join public.members m on m.stammtisch_id = t.stammtisch_id and m.mitglied_seit <= t.datum
  join public.straf_kategorien k on k.stammtisch_id = t.stammtisch_id and k.system_key = 'fehlen_entschuldigt'
  where t.art = 'stammtisch'
    and t.datum between '2026-01-01' and '2026-07-31'
    and not (m.id = any (t.anwesenheit))
),
niederlage as materialized (
  select gen_random_uuid()::text as id, l.id as spiel_log_id, l.member_id, l.termin_id, t.datum,
         et.straf_kategorie as kategorie, et.straf_betrag as betrag
  from public.spiel_logs l
  join public.spiel_ereignis_typen et on et.id = l.ereignis_typ_id
  join public.termine t on t.id = l.termin_id
  join public.stammtische s on s.id = t.stammtisch_id and s.name = 'die_hellen'
  where l.straf_log_id is null
    and et.straf_kategorie is not null
    and coalesce(et.straf_betrag, 0) > 0
    and t.art = 'stammtisch'
    and t.datum between '2026-01-01' and '2026-07-31'
),
neu as (
  insert into public.straf_logs (id, member_id, termin_id, kategorie, betrag, notiz, logged_at, beglichen)
  select id, member_id, termin_id, kategorie, betrag, 'Nachgetragen (Altbestand)',
         (datum + time '21:00') at time zone 'Europe/Berlin', true
  from fehlen
  union all
  select id, member_id, termin_id, kategorie, betrag, 'Nachgetragen (Altbestand)',
         (datum + time '21:00') at time zone 'Europe/Berlin', true
  from niederlage
  returning id
)
update public.spiel_logs l
set straf_log_id = n.id
from niederlage n
where l.id = n.spiel_log_id;

-- Prüfabfrage (erwartet: 22 x 10 EUR + 19 x 5 EUR = 315 EUR):
--   select k.label, count(*), sum(sl.betrag)
--   from public.straf_logs sl join public.straf_kategorien k on k.id = sl.kategorie
--   where sl.notiz = 'Nachgetragen (Altbestand)' group by 1;
