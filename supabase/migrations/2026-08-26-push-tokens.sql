-- Push-Benachrichtigungen (Schritt 1): pro Mitglied ein Expo-Push-Token.
-- Ein Token pro Mitglied (unique auf member_id) — passt zum bestehenden
-- Session-Modell (ein Gerät pro Mitglied); erneute Registrierung
-- überschreibt einfach den alten Token. RLS erlaubt bewusst allen Geräten
-- im selben Stammtisch Lesezugriff auf alle Tokens der Gruppe, damit der
-- Client direkt (ohne Server-Funktion) an Expos Push-API senden kann.

create table if not exists dev.push_tokens (
  id text primary key,
  member_id text not null references dev.members(id) on delete cascade,
  token text not null,
  platform text not null,
  updated_at timestamptz not null default now(),
  unique (member_id)
);

alter table dev.push_tokens enable row level security;

create policy "stammtisch access via member" on dev.push_tokens for all using (
  exists (
    select 1 from dev.members m
    where m.id = push_tokens.member_id
      and m.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
  )
) with check (
  exists (
    select 1 from dev.members m
    where m.id = push_tokens.member_id
      and m.stammtisch_id in (select stammtisch_id from dev.stammtisch_access where auth_user_id = auth.uid())
  )
);
