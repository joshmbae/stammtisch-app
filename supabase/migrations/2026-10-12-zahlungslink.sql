-- Zahlungslink des Stammtischs (z. B. PayPal-Pool), unter Einstellungen →
-- Strafen & Spiele. Beim Begleichen von Strafen bietet die App an, ihn zu
-- öffnen. Nur https-Links; die App prüft das vor dem Speichern und Öffnen.
--
-- Prod-Übernahme: „dev.“ durch „public.“ ersetzen. Vor dem Ausliefern der
-- App-Version ausführen. Ohne Spalte läuft die App weiter, nur das Speichern
-- eines Links in den Einstellungen schlägt fehl.

alter table dev.verordnung
  add column if not exists zahlungs_link text;
