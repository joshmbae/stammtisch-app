-- Jedes Spiel-Ereignis mit Strafe bekommt ab jetzt eine EIGENE, nach ihm
-- benannte Straf-Kategorie statt einer geteilten generischen "Spiel-
-- Ereignis"-Sammelkategorie. Grund: mit der Sammelkategorie zeigten
-- Strafen im Aktivitätsprotokoll/Feed nur "Spiel-Ereignis" statt z. B.
-- "Schock-Aus", und unterschiedliche Ereignisse mit eigenem Betrag
-- überschrieben sich gegenseitig, sobald man die Sammelkategorie editierte
-- (der Betrag steht jetzt korrekt nur noch auf spiel_ereignis_typen.
-- straf_betrag bzw. der eigenen Kategorie, nicht mehr geteilt).
--
-- ACHTUNG: nicht idempotent — nicht zweimal ausführen.

alter table dev.straf_kategorien add column if not exists spiel_ereignis_typ_id
  text references dev.spiel_ereignis_typen(id) on delete cascade;

-- Bestehende Kopplungen (z. B. "Niederlage" -> "Schock-Niederlage") formal
-- als spiel-gebunden markieren, damit sie nicht mehr über die allgemeine
-- Verwaltung gelöscht werden können (würde die Kopplung silently brechen).
-- WICHTIG: die generische "Spiel-Ereignis"-Sammelkategorie explizit
-- ausschließen — die kann von mehreren Ereignistypen gleichzeitig
-- referenziert sein (n:1), ist also nie wirklich "einem" Ereignis zugehörig
-- (die wird weiter unten separat aufgelöst).
update dev.straf_kategorien sk
set spiel_ereignis_typ_id = et.id, ist_system = true
from dev.spiel_ereignis_typen et
where et.straf_kategorie = sk.id
  and sk.system_key is distinct from 'spiel_ereignis';

-- Jeden Ereignistyp, der noch auf die generische "Spiel-Ereignis"-
-- Sammelkategorie zeigt, auf eine eigene, nach ihm benannte Kategorie
-- umstellen (Betrag kommt vom Ereignistyp selbst, nicht von der alten
-- Sammelkategorie, die ja immer 0 war).
insert into dev.straf_kategorien (id, stammtisch_id, label, betrag, emoji, reihenfolge, ist_system, spiel_ereignis_typ_id)
select gen_random_uuid()::text, sp.stammtisch_id, et.label, coalesce(et.straf_betrag, 0), coalesce(et.emoji, '🎮'), 999, true, et.id
from dev.spiel_ereignis_typen et
join dev.spiele sp on sp.id = et.spiel_id
join dev.straf_kategorien alt on alt.id = et.straf_kategorie
where alt.system_key = 'spiel_ereignis';

update dev.spiel_ereignis_typen et
set straf_kategorie = neu.id
from dev.straf_kategorien neu
where neu.spiel_ereignis_typ_id = et.id
  and exists (
    select 1 from dev.straf_kategorien alt
    where alt.id = et.straf_kategorie and alt.system_key = 'spiel_ereignis'
  );

-- Die jetzt ungenutzte generische Sammelkategorie entfernen
delete from dev.straf_kategorien where system_key = 'spiel_ereignis';
