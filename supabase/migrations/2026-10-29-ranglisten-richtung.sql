-- Pro Rangliste, ob viel oder wenig vorne liegt (z. B. Strafen: wenig ist
-- gut). Schlüssel = Ranglisten-Key aus utils/stats.ts („strafen“,
-- „verspaetung“, „spiel_<ereignisTypId>“), Wert „viel“ oder „wenig“. Fehlt
-- ein Schlüssel, gilt „viel“. Umschaltbar direkt in der Tabelle.
--
-- Prod-Übernahme: „dev.“ durch „public.“ ersetzen. Vor dem Ausliefern der
-- App-Version ausführen. Ohne Spalte läuft die App weiter (alles „viel“),
-- nur das Umschalten schlägt fehl.

alter table dev.verordnung
  add column if not exists ranglisten_richtung jsonb not null default '{}'::jsonb;
