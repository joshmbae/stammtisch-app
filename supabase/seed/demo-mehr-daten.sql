-- Mehr Testdaten für den „Stammtisch Demo“ im dev-Schema.
--
-- Nur gegen dev ausführen, nie gegen public. Zwei Teile: Teil 1 legt nur neu
-- an (bricht ab, wenn seed2-Daten schon da sind), Teil 2 ändert bestehende
-- Demo-Daten. Getrennt, weil der Supabase-MCP-Server Befehle mit delete/update
-- extra bestätigen lässt. Zum Neu-Einspielen erst „AUFRÄUMEN“ ausführen.
-- Zufallswerte sind über setseed fest, also bei jedem Lauf gleich.
--
-- Legt an:
--   * 2025: 12 Stammtische + Weihnachtsfeier mit Anwesenheit, Strafen
--     (bezahlt), Schocken, Verspätungen, Kasse → Allzeit-Statistik, Titel 2025
--   * 2026 (vorhandene Termine): Agenda mit Autoren, zwei weitere Protokolle,
--     Fotos für drei Abende
--   * Zukunft: Stammtisch 03.12., Weihnachtsfeier 18.12., Stammtisch 07.01.27
--     mit Zusagen, Absagen (mit Grund) und Agenda
--   * Profilbilder (gezeichnete Avatare von DiceBear) für fünf Mitglieder
--
-- Aufräumen: Abschnitt „AUFRÄUMEN“ ganz unten ausführen.

do $$
declare
  st constant uuid := '00000000-0000-4000-8000-00000000d3a0';
  alle constant text[] := array['demo-m1','demo-m2','demo-m3','demo-m4','demo-m5','demo-m6','demo-m7','demo-m8'];
  kat_niederlage constant text := '1794138367677mgrbyx';
  kat text;
  monat int;
  tag date;
  tid text;
  da text[];
  weg text[];
  m text;
  i int;
  n int;
  sid text;
  minuten int;
  strafen_summe numeric := 0;
  start_ts timestamptz;
begin
  perform setseed(0.42);

  if exists (select 1 from dev.termine where id like 'seed2-%') then
    raise exception 'seed2-Daten sind schon da – erst AUFRÄUMEN ausführen';
  end if;

  -- ── 2025: ein Stammtisch am ersten Donnerstag jedes Monats ──────────────
  for monat in 1..12 loop
    tag := make_date(2025, monat, 1);
    tag := tag + ((4 - extract(dow from tag)::int + 7) % 7);  -- erster Donnerstag
    tid := format('seed2-t2025-%s', lpad(monat::text, 2, '0'));
    start_ts := (tag + time '19:30') at time zone 'Europe/Berlin';

    -- 5 bis 8 sind da, der Rest hat abgesagt.
    select array_agg(x order by random()) into da from unnest(alle) x;
    n := 5 + floor(random() * 4)::int;
    weg := da[n + 1:];
    da := da[1:n];

    insert into dev.termine (id, stammtisch_id, art, datum, start_zeit, end_zeit, ort, aktiv, started_at, ended_at, anwesenheit, absagen, absage_gruende, ankunft_zeiten)
    values (tid, st, 'stammtisch', tag, '19:30', '23:00', 'Gasthaus Zur Linde', false,
            start_ts, start_ts + interval '4 hours', da, weg,
            coalesce((select jsonb_object_agg(w, (array['Arbeit','krank','Familie','im Urlaub'])[1 + floor(random() * 4)::int]) from unnest(weg) w), '{}'::jsonb),
            '{}'::jsonb);

    -- Wer fehlt: Fehlen (entschuldigt), bezahlt.
    foreach m in array weg loop
      insert into dev.straf_logs (id, member_id, termin_id, kategorie, betrag, logged_at, beglichen)
      values (format('seed2-s-%s-%s-f', tid, m), m, tid, 'demo-k1', 10, start_ts + interval '30 minutes', true);
      strafen_summe := strafen_summe + 10;
    end loop;

    -- Verspätungen (0–2) mit passender Strafe ab 15 Minuten.
    n := floor(random() * 3)::int;
    for i in 1..n loop
      m := da[1 + floor(random() * array_length(da, 1))::int];
      minuten := 5 + floor(random() * 41)::int;
      sid := format('seed2-v-%s-%s', tid, i);
      if not exists (select 1 from dev.verspaetung_logs where termin_id = tid and member_id = m) then
        insert into dev.verspaetung_logs (id, member_id, termin_id, datum, minuten_verspaetet, grund)
        values (sid, m, tid, tag, minuten, (array[null, 'Zug verspätet', 'Stau', 'Arbeit'])[1 + floor(random() * 4)::int]);
        if minuten >= 15 then
          insert into dev.straf_logs (id, member_id, termin_id, kategorie, betrag, logged_at, beglichen)
          values (sid || '-s', m, tid, case when minuten > 30 then 'demo-k4' else 'demo-k3' end,
                  case when minuten > 30 then 10 else 5 end, start_ts + make_interval(mins => minuten), true);
          strafen_summe := strafen_summe + case when minuten > 30 then 10 else 5 end;
        end if;
      end if;
    end loop;

    -- Kleinkram am Tisch (0–3): Handy, Runde vergessen.
    n := floor(random() * 4)::int;
    for i in 1..n loop
      m := da[1 + floor(random() * array_length(da, 1))::int];
      kat := case when random() < 0.6 then 'demo-k5' else 'demo-k6' end;
      insert into dev.straf_logs (id, member_id, termin_id, kategorie, betrag, logged_at, beglichen)
      values (format('seed2-s-%s-k%s', tid, i), m, tid, kat, case kat when 'demo-k5' then 2 else 3 end,
              start_ts + make_interval(mins => 45 + i * 20), true);
      strafen_summe := strafen_summe + case kat when 'demo-k5' then 2 else 3 end;
    end loop;

    -- Schocken: 2–5 Niederlagen (1 € Strafe), 0–2 Schock-Aus.
    n := 2 + floor(random() * 4)::int;
    for i in 1..n loop
      m := da[1 + floor(random() * array_length(da, 1))::int];
      sid := format('seed2-sp-%s-n%s', tid, i);
      insert into dev.straf_logs (id, member_id, termin_id, kategorie, betrag, logged_at, beglichen)
      values (sid || '-s', m, tid, kat_niederlage, 1, start_ts + make_interval(mins => 60 + i * 15), true);
      insert into dev.spiel_logs (id, member_id, spiel_id, ereignis_typ_id, termin_id, straf_log_id, logged_at)
      values (sid, m, 'demo-sp1', 'demo-et1', tid, sid || '-s', start_ts + make_interval(mins => 60 + i * 15));
      strafen_summe := strafen_summe + 1;
    end loop;
    n := floor(random() * 3)::int;
    for i in 1..n loop
      m := da[1 + floor(random() * array_length(da, 1))::int];
      insert into dev.spiel_logs (id, member_id, spiel_id, ereignis_typ_id, termin_id, logged_at)
      values (format('seed2-sp-%s-a%s', tid, i), m, 'demo-sp1', 'demo-et2', tid, start_ts + make_interval(mins => 70 + i * 25));
    end loop;
  end loop;

  -- Weihnachtsfeier 2025: alle da.
  insert into dev.termine (id, stammtisch_id, art, titel, datum, start_zeit, end_zeit, ort, notizen, aktiv, started_at, ended_at, anwesenheit, absagen, absage_gruende, ankunft_zeiten)
  values ('seed2-t2025-xmas', st, 'veranstaltung', 'Weihnachtsfeier', '2025-12-19', '18:00', '23:30', 'Gasthaus Zur Linde, Nebenzimmer',
          'Wichteln bis 15 €.', false, '2025-12-19 17:00+00', '2025-12-19 22:30+00', alle, '{}', '{}'::jsonb, '{}'::jsonb);

  -- Kasse 2025.
  insert into dev.kasse (id, stammtisch_id, typ, betrag, beschreibung, datum, beglichen) values
    ('seed2-c2025-beitrag', st, 'einnahme', 160, 'Jahresbeitrag 2025 (8 × 20 €)', '2025-01-09 12:00+00', true),
    ('seed2-c2025-strafen', st, 'einnahme', strafen_summe, 'Strafen 2025, gesammelt eingezahlt', '2025-12-20 12:00+00', true),
    ('seed2-c2025-xmas', st, 'ausgabe', 186.40, 'Weihnachtsfeier 2025: Essen und Getränke', '2025-12-19 23:00+00', true),
    ('seed2-c2025-kranz', st, 'ausgabe', 35, 'Blumen für Andis Mutter', '2025-06-14 12:00+00', true);

  -- ── 2026: Protokolle zu vorhandenen Abenden ──────────────────────────
  insert into dev.protokolle (id, termin_id, titel, inhalt, created_at, updated_at) values
    ('seed2-p-t10', 'demo-t10', 'Oktober-Stammtisch',
     E'Kassenprüfung durch Jens: alles in Ordnung.\nAndi übernimmt die Weihnachtsfeier, Termin 18.12. im Nebenzimmer.\nBeschlossen: Wichteln bis 15 €.',
     '2026-10-09 09:00+00', '2026-10-09 09:00+00'),
    ('seed2-p-t11', 'demo-t11', 'Grillfest',
     E'Alle acht da, Wetter hat gehalten.\nMarkus bekommt einen Gutschein als Dankeschön für den Garten (aus der Kasse).',
     '2026-10-25 10:00+00', '2026-10-25 10:00+00');

  -- ── Zukunft ────────────────────────────────────────────────────────────
  insert into dev.termine (id, stammtisch_id, art, titel, datum, start_zeit, end_zeit, ort, notizen, aktiv, anwesenheit, absagen, absage_gruende, ankunft_zeiten, agenda) values
    ('seed2-t-2026-12-03', st, 'stammtisch', null, '2026-12-03', '19:30', '23:00', 'Gasthaus Zur Linde', null, false,
     array['demo-m1','demo-m2','demo-m4','demo-m6'], array['demo-m5'], '{"demo-m5": "Dienstreise"}'::jsonb, '{}'::jsonb,
     E'- Jahresrückblick 2026 {von:demo-m2}\n- Ausflug im Frühjahr? {von:demo-m6}\n- Neues Strafen-Emoji für „Runde vergessen“ {von:demo-m4}'),
    ('seed2-t-2026-12-18', st, 'veranstaltung', 'Weihnachtsfeier', '2026-12-18', '18:00', '23:30', 'Gasthaus Zur Linde, Nebenzimmer',
     'Wichteln bis 15 €. Partner willkommen.', false,
     array['demo-m1','demo-m2','demo-m3','demo-m4','demo-m8'], '{}', '{}'::jsonb, '{}'::jsonb, null),
    ('seed2-t-2027-01-07', st, 'stammtisch', null, '2027-01-07', '19:30', '23:00', 'Gasthaus Zur Linde', null, false,
     array['demo-m2'], '{}', '{}'::jsonb, '{}'::jsonb, null);

end $$;

-- ── TEIL 2: bestehende Demo-Daten anreichern ────────────────────────────
update dev.termine set
  agenda = case id
    when 'demo-t9' then E'- Grillfest im Oktober planen {von:demo-m1}\n- Neue Schafkopf-Karten kaufen {von:demo-m2}\n- Jahresbeitrag 2027 {von:demo-m1}'
    when 'demo-t10' then E'- Kassenprüfung {von:demo-m1}\n- Wer organisiert die Weihnachtsfeier? {von:demo-m4}'
    when 'demo-t12' then E'- Rückblick Grillfest {von:demo-m6}\n- Termin Weihnachtsfeier festlegen {von:demo-m2}\n- Satzung: Handy-Strafe auf 3 €? {von:demo-m7}'
    else agenda end,
  bild_url = case id
    when 'demo-t9' then 'https://picsum.photos/id/1080/1600/900'
    when 'demo-t10' then 'https://picsum.photos/id/1047/1600/900'
    when 'demo-t11' then 'https://picsum.photos/id/292/1600/900'
    else bild_url end
where stammtisch_id = '00000000-0000-4000-8000-00000000d3a0' and id in ('demo-t9','demo-t10','demo-t11','demo-t12');

-- Profilbilder: gezeichnete Avatare (DiceBear), keine echten Gesichter.
update dev.members set photo_url = 'https://api.dicebear.com/9.x/notionists/png?size=256&backgroundColor=e8dcc4&seed=' || id
where stammtisch_id = '00000000-0000-4000-8000-00000000d3a0' and id in ('demo-m1','demo-m3','demo-m4','demo-m6','demo-m8');

-- ── AUFRÄUMEN (bei Bedarf einzeln ausführen) ─────────────────────────────
-- delete from dev.spiel_logs where id like 'seed2-%';
-- delete from dev.straf_logs where id like 'seed2-%';
-- delete from dev.verspaetung_logs where id like 'seed2-%';
-- delete from dev.protokolle where id like 'seed2-%';
-- delete from dev.kasse where id like 'seed2-%';
-- delete from dev.termine where id like 'seed2-%';
-- update dev.termine set agenda = null where id in ('demo-t9','demo-t10','demo-t12');
-- update dev.termine set bild_url = null where id in ('demo-t9','demo-t10','demo-t11');
-- update dev.members set photo_url = null where photo_url like 'https://api.dicebear.com/%';
