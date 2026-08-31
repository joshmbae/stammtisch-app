-- Mitglieder-Rollen (bisher fest im Code: constants/design.ts ROLLEN)
-- werden pro Stammtisch editierbar, analog zu den schon bestehenden
-- "regeln". Keine eigene Tabelle nötig — einfach eine Spalte auf
-- verordnung, genau wie regeln.
--
-- Bestehende Stammtische behalten exakt die heutigen 13 Rollen (nichts
-- ändert sich für sie). Der Spalten-Default sorgt dafür, dass neu
-- angelegte Stammtische künftig automatisch mit einem schlanken,
-- generischen Set starten.

alter table dev.verordnung add column if not exists rollen_optionen text[]
  default array['Mitglied', 'Kassenwart', 'Schriftführer'];

update dev.verordnung
set rollen_optionen = array[
  'Stammtischkönig', 'Schriftführer', 'Kassenwart', 'Bierwart', 'Eventmanager',
  'Vize-Eventmanager', 'Reserviermeister', 'Vize-Reserviermeister', 'Kameramann',
  'Foto-Beauftragter', 'Reiseminister', 'Mitglied', 'Gast'
]
where rollen_optionen is null;
