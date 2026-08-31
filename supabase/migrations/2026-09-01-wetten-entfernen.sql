-- Wetten-Feature komplett entfernt (App-Store-Anforderung: kein Wett-/
-- Glücksspielbezug). Die `wetten`-Tabelle bleibt bewusst unangetastet
-- (nicht destruktiv, jederzeit reversibel) — nur der App-Code verwendet
-- sie nicht mehr. Bestehende Strafen mit der System-Kategorie
-- "Verlorene Wette" werden auf "Sonstiges" umgeschrieben, mit einem
-- Hinweis in der Notiz, damit der historische Kontext erhalten bleibt
-- (aus "gegen Tom" wird "Verlorene Wette – gegen Tom").
--
-- ACHTUNG: nicht idempotent — nicht zweimal ausführen.

update dev.straf_logs sl
set kategorie = sonstiges.id,
    notiz = 'Verlorene Wette' || case when sl.notiz is not null then ' – ' || sl.notiz else '' end
from dev.members m, dev.straf_kategorien alt, dev.straf_kategorien sonstiges
where sl.member_id = m.id
  and alt.stammtisch_id = m.stammtisch_id
  and alt.system_key = 'wette_verloren'
  and sl.kategorie = alt.id
  and sonstiges.stammtisch_id = m.stammtisch_id
  and sonstiges.system_key = 'sonstiges';

delete from dev.straf_kategorien where system_key = 'wette_verloren';
