# Migrations

Schema-Änderungen (neue Tabelle, neue Spalte, geänderte Policy, ...) werden
zuerst gegen das `dev`-Schema getestet (siehe `.env` /
`EXPO_PUBLIC_SUPABASE_SCHEMA`) und erst danach von Hand gegen `public`
(Prod) übernommen. Es gibt keine automatische Synchronisierung zwischen den
beiden Schemas.

Damit bei der Prod-Übernahme nichts vergessen wird: jede Schema-Änderung als
eigene `.sql`-Datei hier ablegen, chronologisch nummeriert.

## Vorgehen

1. Neues Feature braucht eine Schema-Änderung → SQL im Supabase SQL Editor
   gegen `dev` schreiben und testen (z. B. `alter table dev.termine add
   column ...`).
2. Sobald die Änderung fertig ist, das SQL hier als neue Datei ablegen:
   ```
   supabase/migrations/2026-07-13-termine-add-notiz.sql
   ```
   Dateiname: Datum + kurze Beschreibung. Inhalt: das SQL, so wie es gegen
   `dev` gelaufen ist (mit `dev.` als Schema-Präfix).
3. Beim Übernehmen nach Prod: dieselbe Datei nochmal ausführen, aber
   `dev.` durch `public.` ersetzt (im SQL Editor, gegen Prod).
4. Datei bleibt danach als Historie liegen (kein Löschen) — nichts weiter
   nötig, es gibt kein Tool, das diese Dateien automatisch anwendet.
