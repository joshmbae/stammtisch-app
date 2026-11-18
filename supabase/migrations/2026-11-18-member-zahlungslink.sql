-- PayPal-Link pro Mitglied: Wer eine Stammtischrechnung für alle bezahlt hat,
-- bekommt die Anteile der anderen zurück. Mit eigenem Link (z. B.
-- paypal.me/name) können die anderen ihren Anteil direkt aus der Kasse
-- heraus per PayPal zahlen; bei paypal.me ist der Betrag vorausgefüllt.
--
-- Nur eine neue, optionale Spalte – ältere App-Versionen stört sie nicht.
-- Die App schickt die Spalte nur mit, wenn ein Wert gesetzt ist.
--
-- Prod-Übernahme: „dev.“ durch „public.“ ersetzen und VOR der App-Version
-- ausführen, die das Feld im Profil anbietet.

alter table dev.members add column if not exists zahlungs_link text;

-- Nur https-Links zulassen (die App prüft das auch, siehe utils/zahlungslink.ts).
alter table dev.members drop constraint if exists members_zahlungs_link_https;
alter table dev.members add constraint members_zahlungs_link_https
  check (zahlungs_link is null or zahlungs_link like 'https://%');
