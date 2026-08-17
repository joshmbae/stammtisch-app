-- Live-Updates im Termin-Screen (Supabase Realtime).
--
-- postgres_changes-Filter werden bei DELETE-Events gegen das ALTE Row-Image
-- ausgewertet. Mit REPLICA IDENTITY DEFAULT enthält dieses alte Row-Image bei
-- DELETE nur die Primary-Key-Spalte -- unser Filter läuft aber über
-- termin_id (keine PK). Ohne REPLICA IDENTITY FULL würden DELETE-Events auf
-- diesen vier Tabellen serverseitig nie matchen und nie ankommen.
-- termine (Filter über die PK "id") und activity_log (nur INSERT) brauchen
-- das nicht.

alter table dev.spiel_logs        replica identity full;
alter table dev.straf_logs        replica identity full;
alter table dev.verspaetung_logs  replica identity full;
alter table dev.wetten            replica identity full;

alter publication supabase_realtime add table dev.spiel_logs;
alter publication supabase_realtime add table dev.straf_logs;
alter publication supabase_realtime add table dev.verspaetung_logs;
alter publication supabase_realtime add table dev.wetten;
alter publication supabase_realtime add table dev.termine;
alter publication supabase_realtime add table dev.activity_log;
