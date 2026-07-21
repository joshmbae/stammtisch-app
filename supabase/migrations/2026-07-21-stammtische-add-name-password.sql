-- Multi-Stammtisch-Unterstützung: Name + Passwort-Hash je Stammtisch, damit
-- Nutzer beim Start einen bestehenden Stammtisch beitreten oder einen neuen
-- anlegen können. Nullable, damit die bestehende Prod-Zeile (ohne Name/PW)
-- nicht bricht, bis sie manuell nachgepflegt wird.
alter table dev.stammtische add column if not exists name text;
alter table dev.stammtische add column if not exists password_hash text;
