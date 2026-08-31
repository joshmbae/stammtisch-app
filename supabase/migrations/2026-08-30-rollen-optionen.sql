-- Mitglieder-Rollen (bisher fest im Code: constants/design.ts ROLLEN)
-- werden pro Stammtisch editierbar, analog zu den schon bestehenden
-- "regeln". Keine eigene Tabelle nötig — einfach eine Spalte auf
-- verordnung, genau wie regeln.
--
-- Bestehende Stammtische behalten exakt die heutigen 13 Rollen (nichts
-- ändert sich für sie). Der Spalten-Default sorgt dafür, dass neu
-- angelegte Stammtische künftig automatisch mit einem schlanken,
-- generischen Set starten.

-- Ohne Default anlegen, damit bestehende Zeilen erstmal NULL bleiben
-- (Postgres würde bei ADD COLUMN ... DEFAULT sonst sofort allen
-- bestehenden Zeilen den Default zuweisen statt NULL zu lassen — dann
-- könnte das anschließende "where rollen_optionen is null" nichts mehr
-- backfillen).
alter table dev.verordnung add column if not exists rollen_optionen text[];

update dev.verordnung
set rollen_optionen = array[
  'Stammtischkönig', 'Schriftführer', 'Kassenwart', 'Bierwart', 'Eventmanager',
  'Vize-Eventmanager', 'Reserviermeister', 'Vize-Reserviermeister', 'Kameramann',
  'Foto-Beauftragter', 'Reiseminister', 'Mitglied', 'Gast'
]
where rollen_optionen is null;

-- Default erst jetzt setzen — gilt nur für künftig neu angelegte Zeilen,
-- die bestehenden (gerade befüllten) Zeilen bleiben unangetastet.
alter table dev.verordnung alter column rollen_optionen
  set default array['Mitglied', 'Kassenwart', 'Schriftführer'];
