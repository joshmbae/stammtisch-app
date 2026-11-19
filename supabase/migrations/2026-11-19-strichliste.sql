-- Strichliste: Dinge, die ein Stammtisch am Abend pro Person mitzählt, ohne
-- dass es ein Spiel ist (z. B. Bier, Kurze, Runde ausgegeben).
--
-- Technisch ein besonderes „Spiel“ pro Stammtisch (art = 'strichliste'):
-- Die Einträge sind seine Ereignistypen, jeder Strich ein spiel_logs-Eintrag.
-- So funktionieren Ranglisten, Profil, Rückblick und Realtime ohne neue
-- Tabellen. Die Strichliste ist immer aktiv, unabhängig vom aktiven Spiel,
-- und taucht in Spiel-Listen nicht auf.
--
-- Ältere App-Versionen sehen die Strichliste als normales Spiel „Strichliste“.
-- Prod-Übernahme: „dev.“ durch „public.“ ersetzen und vor der App-Version
-- ausführen, die die Strichliste anbietet.

alter table dev.spiele add column if not exists art text not null default 'spiel';
alter table dev.spiele drop constraint if exists spiele_art_check;
alter table dev.spiele add constraint spiele_art_check check (art in ('spiel', 'strichliste'));
