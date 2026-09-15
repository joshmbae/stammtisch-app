-- Optionales Titelbild pro Termin (Upload in den "avatars"-Storage-Bucket,
-- Pfadpräfix "termin-bild_", siehe uploadTerminBild in storage.ts).

alter table dev.termine
  add column if not exists bild_url text;
