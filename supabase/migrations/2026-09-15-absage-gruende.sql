-- Begründung bei Terminabsagen: memberId -> Freitext, nur für Mitglieder,
-- die aktuell in `absagen` stehen. Wird gelöscht, sobald die Person wieder
-- zusagt oder ihre Absage zurückzieht (siehe setRsvpStatus in storage.ts).

alter table dev.termine
  add column if not exists absage_gruende jsonb not null default '{}'::jsonb;
