-- Strafenkategorien werden von einer fest codierten Liste (identisch für
-- jeden Stammtisch) zu einer pro Stammtisch editierbaren Tabelle. Drei
-- Kategorien sind "System"-Kategorien (ist_system = true, system_key
-- gesetzt): sonstiges, spiel_ereignis, wette_verloren — andere Features
-- legen automatisch straf_logs mit genau diesen Kategorien an, deshalb
-- dürfen sie nicht gelöscht werden (Label/Betrag/Emoji bleiben aber
-- editierbar) und spiel_ereignis/wette_verloren tauchen nicht im
-- manuellen Kategorie-Picker auf. schock_niederlage bekommt zwar ebenfalls
-- einen system_key (für den Datenmigrations-Crosswalk unten), ist aber
-- KEIN ist_system — reines historisches Relikt (Schocken läuft heute über
-- das generische Spiele-System), frei löschbar wie jede andere Kategorie.
-- Der Client findet die drei echten System-Kategorien über system_key
-- statt über einen fest verdrahteten String.
--
-- Datenerhalt: es gibt bereits echte straf_logs (anders als beim
-- Spiele-Umbau, siehe 2026-08-05-spiele.sql). Für JEDEN bestehenden
-- Stammtisch werden deshalb alle 10 bisherigen Kategorien mit einer neuen
-- zufälligen id angelegt, und die alten straf_logs.kategorie- bzw.
-- spiel_ereignis_typen.straf_kategorie-Werte (bisher der literale Key wie
-- "sonstiges") werden per system_key-Crosswalk auf diese neuen ids
-- umgeschrieben.
--
-- ACHTUNG: nicht idempotent — nicht zweimal ausführen (würde die
-- Bestandsdaten-Zeilen duplizieren).

create table if not exists dev.straf_kategorien (
  id text primary key default gen_random_uuid()::text,
  stammtisch_id uuid not null references dev.stammtische(id) on delete cascade,
  label text not null,
  betrag numeric not null default 0,
  emoji text,
  beschreibung text,
  reihenfolge int not null default 0,
  ist_system boolean not null default false,
  system_key text
);

alter table dev.straf_kategorien enable row level security;

create policy "stammtisch access" on dev.straf_kategorien for all using (
  stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
) with check (
  stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
);

-- ─── Bestandsdaten: alle bisherigen Kategorien pro Stammtisch anlegen ────
insert into dev.straf_kategorien (stammtisch_id, label, betrag, emoji, beschreibung, reihenfolge, ist_system, system_key)
select s.id, 'Fehlen (entschuld.)', 10, '📵', 'Angekündigt bis 23:59 Uhr Vortag oder triftiger Grund', 0, false, 'fehlen_entschuldigt' from dev.stammtische s
union all
select s.id, 'Fehlen (unentschuld.)', 50, '🚫', null, 1, false, 'fehlen_unentschuldigt' from dev.stammtische s
union all
select s.id, 'Zu spät entschuld. (ab 30 Min.)', 5, '⏰', 'Straffrei bei <30 Min. Verspätung, ab 30 Min. 5 €', 2, false, 'spaet_entschuldigt' from dev.stammtische s
union all
select s.id, 'Zu spät 15–30 Min.', 5, '⏱️', 'Unentschuldigt – Trinkspruch ab 1 Min., 5 € ab 15 Min.', 3, false, 'spaet_15min' from dev.stammtische s
union all
select s.id, 'Zu spät >30 Min.', 10, '⏱️', 'Unentschuldigt', 4, false, 'spaet_30min' from dev.stammtische s
union all
select s.id, 'Männl. Gast', 20, '👨', 'Pro Gast – weibliche Gäste nur am Valentinsstammtisch', 5, false, 'maennlicher_gast' from dev.stammtische s
union all
select s.id, 'Schock-Niederlage', 5, '🎲', 'Historisch – wird nicht mehr automatisch vergeben', 6, false, 'schock_niederlage' from dev.stammtische s
union all
select s.id, 'Spiel-Ereignis', 0, '🎮', 'Wird automatisch bei einem konfigurierten Spiel-Ereignis eingetragen', 7, true, 'spiel_ereignis' from dev.stammtische s
union all
select s.id, 'Verlorene Wette', 0, '🤝', 'Wird automatisch bei einer verlorenen Wette eingetragen, Betrag = Wetteinsatz', 8, true, 'wette_verloren' from dev.stammtische s
union all
select s.id, 'Sonstiges', 0, '💰', null, 9, true, 'sonstiges' from dev.stammtische s;

-- ─── Bestehende straf_logs auf die neuen ids ummappen ────────────────────
update dev.straf_logs sl
set kategorie = sk.id
from dev.members m, dev.straf_kategorien sk
where sl.member_id = m.id
  and sk.stammtisch_id = m.stammtisch_id
  and sk.system_key = sl.kategorie;

-- ─── Bestehende Spiel-Ereignistypen (Strafe-Kopplung) genauso ummappen ───
update dev.spiel_ereignis_typen et
set straf_kategorie = sk.id
from dev.spiele sp, dev.straf_kategorien sk
where et.spiel_id = sp.id
  and et.straf_kategorie is not null
  and sk.stammtisch_id = sp.stammtisch_id
  and sk.system_key = et.straf_kategorie;
