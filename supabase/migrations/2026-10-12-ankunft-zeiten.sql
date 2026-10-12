-- Ankunftszeiten am Abend: memberId -> Zeitpunkt (ISO), gesetzt, wenn jemand
-- in der Live-Ansicht als anwesend eingetragen wird; entfernt, wenn er wieder
-- ausgetragen wird. Zusagen vorab („Bin dabei") setzen keine Zeit. Daraus
-- entsteht der Anwesenheits-Verlauf („wer kam wann").
--
-- Prod-Übernahme: „dev.“ durch „public.“ ersetzen. Vor dem Ausliefern der
-- App-Version ausführen; die App kommt ohne die Spalte zwar zurecht
-- (Anwesenheit funktioniert weiter), zeigt dann aber keine Ankunftszeiten.

alter table dev.termine
  add column if not exists ankunft_zeiten jsonb not null default '{}'::jsonb;
