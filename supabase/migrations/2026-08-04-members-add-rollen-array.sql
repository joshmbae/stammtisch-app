-- Mehrfach-Rollen pro Mitglied: neue jsonb-Spalte für ein Array von Rollen,
-- statt der einzelnen "rolle"-Spalte. Bestehende Zeilen ohne "rollen" fallen
-- in utils/storage.ts (rowToMember) auf die alte "rolle"-Spalte zurück, kein
-- Backfill hier nötig. "rolle" bleibt zusätzlich bestehen (wird beim
-- Speichern weiterhin mit der ersten Rolle befüllt) für Abwärtskompatibilität.
alter table dev.members add column if not exists rollen jsonb;
