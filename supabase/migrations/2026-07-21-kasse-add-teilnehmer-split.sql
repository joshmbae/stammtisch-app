-- Stammtischrechnung: Kostenteilung nach Teilnehmern statt einem einzigen
-- "beglichen"-Schalter fürs Ganze. Bestehende Einträge ohne teilnehmer_ids
-- bleiben unverändert (Anzeige fällt in der App auf den alten
-- beglichen-Schalter zurück).
alter table dev.kasse add column if not exists teilnehmer_ids jsonb;
alter table dev.kasse add column if not exists beglichen_ids jsonb;
