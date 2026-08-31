-- Termin-Tabs (Strafen, Wetten) pro Stammtisch aus-/einblendbar, falls eine
-- Gruppe diese Features nicht nutzt. Default true, damit sich für
-- bestehende Stammtische nichts ändert.

alter table dev.verordnung add column if not exists tab_strafen_aktiv boolean not null default true;
alter table dev.verordnung add column if not exists tab_wetten_aktiv boolean not null default true;
