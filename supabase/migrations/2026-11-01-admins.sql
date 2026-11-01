-- Admins pro Stammtisch (Stufe 1, nur in der App durchgesetzt).
--
-- Admins dürfen Einstellungen ändern (Grunddaten, Logo, Satzung, Rollen,
-- Strafenkatalog, Spiele, Zahlungslink, Stammtisch löschen), Ranglisten
-- umdrehen, fremde Profile löschen und weitere Admins ernennen. Alles
-- andere bleibt für alle. Gibt es in einem Stammtisch noch keinen Admin,
-- darf jede:r alles (so bleiben bestehende Runden nicht ausgesperrt).
--
-- Die Prüfung passiert in der App (utils/useAdmin.ts). Eine Sperre auf dem
-- Server braucht eine feste Verbindung von Gerät und Profil, die es erst
-- mit einem echten Login gibt.
--
-- Prod-Übernahme: „dev.“ durch „public.“ ersetzen. Ohne Spalte läuft die App
-- weiter wie bisher (niemand ist Admin, also darf jede:r alles).

alter table dev.members
  add column if not exists ist_admin boolean not null default false;
