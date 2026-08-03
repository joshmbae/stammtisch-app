-- Eigenes Stammtisch-Logo statt des festen App-Logos: URL zum in den
-- "avatars"-Storage-Bucket hochgeladenen Bild (siehe uploadStammtischLogo
-- in utils/storage.ts).
alter table dev.verordnung add column if not exists logo_url text;
