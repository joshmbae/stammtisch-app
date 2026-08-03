-- Generisches Spiele-System: löst den hart codierten "Schocken"-Sonderfall ab.
-- Ein Stammtisch kann eigene Spiele mit 1-4 Ereignistypen anlegen; jeder
-- Ereignistyp kann optional an eine Strafe gekoppelt sein (statt fest im
-- Code verdrahtet). Genau ein Spiel ist pro Stammtisch "aktiv"
-- (verordnung.aktives_spiel_id), das steuert den Spiel-Tab im Termin-Screen.
-- schock_logs bleibt unangetastet (keine Datenmigration nötig, noch keine
-- Produktivdaten vorhanden).

create table if not exists dev.spiele (
  id text primary key,
  stammtisch_id uuid not null references dev.stammtische(id) on delete cascade,
  name text not null,
  emoji text,
  created_at timestamptz not null default now()
);

create table if not exists dev.spiel_ereignis_typen (
  id text primary key,
  spiel_id text not null references dev.spiele(id) on delete cascade,
  label text not null,
  emoji text,
  reihenfolge int not null default 0,
  straf_kategorie text,
  straf_betrag numeric
);

create table if not exists dev.spiel_logs (
  id text primary key,
  member_id text not null references dev.members(id) on delete cascade,
  spiel_id text not null references dev.spiele(id) on delete cascade,
  ereignis_typ_id text not null references dev.spiel_ereignis_typen(id) on delete cascade,
  termin_id text references dev.termine(id) on delete set null,
  straf_log_id text references dev.straf_logs(id) on delete set null,
  logged_at timestamptz not null default now()
);

alter table dev.verordnung
  add column if not exists aktives_spiel_id text references dev.spiele(id) on delete set null;

-- ─── RLS: spiele (direkte stammtisch_id, Muster wie members/termine) ─────
alter table dev.spiele enable row level security;

create policy "stammtisch access" on dev.spiele for all using (
  stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
) with check (
  stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
);

-- ─── RLS: spiel_ereignis_typen (scoped über spiele.stammtisch_id, wie protokolle über termine) ─
alter table dev.spiel_ereignis_typen enable row level security;

create policy "stammtisch access via spiel" on dev.spiel_ereignis_typen for all using (
  exists (
    select 1 from dev.spiele s
    where s.id = spiel_ereignis_typen.spiel_id
      and s.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
  )
) with check (
  exists (
    select 1 from dev.spiele s
    where s.id = spiel_ereignis_typen.spiel_id
      and s.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
  )
);

-- ─── RLS: spiel_logs (scoped über member_id, wie schock_logs/straf_logs) ─
alter table dev.spiel_logs enable row level security;

create policy "stammtisch access via member" on dev.spiel_logs for all using (
  exists (
    select 1 from dev.members m
    where m.id = spiel_logs.member_id
      and m.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
  )
) with check (
  exists (
    select 1 from dev.members m
    where m.id = spiel_logs.member_id
      and m.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
  )
);
