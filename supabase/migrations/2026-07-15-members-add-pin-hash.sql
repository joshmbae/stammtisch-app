-- PIN-Schutz für Mitgliedsprofile: gehashter 4-stelliger PIN, verhindert dass
-- andere Nutzer ein fremdes Profil bearbeiten oder löschen können.
alter table dev.members add column if not exists pin_hash text;
