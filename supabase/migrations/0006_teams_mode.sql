alter table lobbies add column mode text not null default 'ffa' check (mode in ('ffa', 'teams'));
alter table lobby_members add column team_name text;

-- Multi-stage pairs for teams mode: [{"start": "...", "destination": "..."}].
-- Null for ffa races, which keep using start_title/destination_title.
alter table races add column stage_pairs jsonb;
alter table race_participants add column team_name text;
alter table race_participants add column current_stage_index int not null default 0;
