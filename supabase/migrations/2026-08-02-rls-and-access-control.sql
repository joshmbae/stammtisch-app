-- RLS + Zugriffsschutz: Anonymous-Auth-Sessions (ein Gerät = eine Session,
-- persistiert über Neustarts) bekommen über eine Membership-Tabelle Zugriff
-- auf genau die Stammtische, denen sie per Passwort beigetreten sind.
-- Passwort- und PIN-Hashes werden ab jetzt nur noch serverseitig in RPCs
-- verglichen und verlassen nie mehr die Datenbank. Voraussetzung: Anonymous
-- Sign-In muss im Supabase-Projekt aktiviert sein (Dashboard, projektweit).

-- ─── Membership ─────────────────────────────────────────────────────────
create table if not exists dev.stammtisch_access (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  stammtisch_id uuid not null references dev.stammtische(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (auth_user_id, stammtisch_id)
);

alter table dev.stammtisch_access enable row level security;

create policy "read own access" on dev.stammtisch_access
  for select using (auth_user_id = auth.uid());

-- ─── RLS: stammtische ────────────────────────────────────────────────────
alter table dev.stammtische enable row level security;

create policy "read own stammtische" on dev.stammtische
  for select using (
    id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
  );

-- ─── RLS: Tabellen mit direkter stammtisch_id ────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['members','termine','verordnung','kasse','activity_log'] loop
    execute format('alter table dev.%I enable row level security', t);
    execute format(
      'create policy "stammtisch access" on dev.%I for all using (
         stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
       ) with check (
         stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
       )', t);
  end loop;
end $$;

-- ─── RLS: Tabellen nur mit member_id (Zugriff über members.stammtisch_id) ─
do $$
declare
  t text;
begin
  foreach t in array array['verspaetung_logs','schock_logs','wetten','straf_logs'] loop
    execute format('alter table dev.%I enable row level security', t);
    execute format(
      'create policy "stammtisch access via member" on dev.%I for all using (
         exists (
           select 1 from dev.members m
           where m.id = %I.member_id
             and m.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
         )
       ) with check (
         exists (
           select 1 from dev.members m
           where m.id = %I.member_id
             and m.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
         )
       )', t, t, t);
  end loop;
end $$;

-- ─── RLS: protokolle (Zugriff über termine.stammtisch_id) ────────────────
alter table dev.protokolle enable row level security;

create policy "stammtisch access via termin" on dev.protokolle for all using (
  exists (
    select 1 from dev.termine t
    where t.id = protokolle.termin_id
      and t.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
  )
) with check (
  exists (
    select 1 from dev.termine t
    where t.id = protokolle.termin_id
      and t.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
  )
);

-- ─── RPCs ─────────────────────────────────────────────────────────────────
-- security definer: laufen mit den Rechten des Funktions-Owners (postgres),
-- umgehen RLS intern also bewusst, geben aber nie Passwort-/PIN-Hashes zurück.

create or replace function dev.rpc_join_stammtisch(p_name text, p_password_hash text)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = dev, public
as $$
declare
  v_row dev.stammtische%rowtype;
begin
  select * into v_row from dev.stammtische s where s.name ilike trim(p_name) limit 1;
  if v_row.id is null or v_row.password_hash is null or v_row.password_hash <> p_password_hash then
    return;
  end if;
  insert into dev.stammtisch_access (auth_user_id, stammtisch_id)
  values (auth.uid(), v_row.id)
  on conflict do nothing;
  return query select v_row.id, v_row.name;
end;
$$;

create or replace function dev.rpc_create_stammtisch(p_name text, p_password_hash text)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = dev, public
as $$
declare
  v_id uuid;
begin
  insert into dev.stammtische (name, password_hash)
  values (trim(p_name), p_password_hash)
  returning stammtische.id into v_id;
  insert into dev.stammtisch_access (auth_user_id, stammtisch_id) values (auth.uid(), v_id);
  return query select v_id, trim(p_name);
end;
$$;

create or replace function dev.rpc_legacy_single_stammtisch_id()
returns uuid
language plpgsql
security definer
set search_path = dev, public
as $$
declare
  v_id uuid;
  v_count int;
begin
  select count(*) into v_count from dev.stammtische;
  if v_count <> 1 then
    return null;
  end if;
  select s.id into v_id from dev.stammtische s limit 1;
  insert into dev.stammtisch_access (auth_user_id, stammtisch_id)
  values (auth.uid(), v_id)
  on conflict do nothing;
  return v_id;
end;
$$;

create or replace function dev.rpc_verify_member_pin(p_member_id text, p_pin_hash text)
returns boolean
language plpgsql
security definer
set search_path = dev, public
as $$
declare
  v_hash text;
  v_stammtisch_id uuid;
begin
  select pin_hash, stammtisch_id into v_hash, v_stammtisch_id from dev.members where id = p_member_id;
  if v_stammtisch_id is null or v_stammtisch_id not in (
    select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid()
  ) then
    return false;
  end if;
  return v_hash is not null and v_hash = p_pin_hash;
end;
$$;

grant execute on function dev.rpc_join_stammtisch(text, text) to anon, authenticated;
grant execute on function dev.rpc_create_stammtisch(text, text) to anon, authenticated;
grant execute on function dev.rpc_legacy_single_stammtisch_id() to anon, authenticated;
grant execute on function dev.rpc_verify_member_pin(text, text) to anon, authenticated;

-- ─── Storage: avatars-Bucket Upload auf authenticated beschränken ────────
-- (öffentliches Lesen bleibt unverändert; nur wer eine — auch anonyme —
-- Session hat, darf Dateien hochladen)
drop policy if exists "avatars upload" on storage.objects;
create policy "avatars upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');
