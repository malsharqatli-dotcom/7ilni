create extension if not exists pgcrypto;

create table if not exists lobbies (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,
  host_guest_id uuid not null,
  status text not null default 'waiting' check (status in ('waiting','starting','in_progress','finished')),
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  max_players int not null default 8,
  created_at timestamptz not null default now()
);

create table if not exists lobby_members (
  lobby_id uuid not null references lobbies(id) on delete cascade,
  guest_id uuid not null,
  display_name text not null,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (lobby_id, guest_id)
);

create table if not exists races (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  start_title text not null,
  destination_title text not null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists race_participants (
  race_id uuid not null references races(id) on delete cascade,
  guest_id uuid not null,
  display_name text not null,
  status text not null default 'racing' check (status in ('racing','finished','surrendered')),
  hop_count int not null default 0,
  current_title text,
  finished_at timestamptz,
  finish_rank int,
  primary key (race_id, guest_id)
);

create table if not exists race_hops (
  id bigserial primary key,
  race_id uuid not null references races(id) on delete cascade,
  guest_id uuid not null,
  from_title text not null,
  to_title text not null,
  hop_index int not null,
  created_at timestamptz not null default now()
);

create table if not exists cached_articles (
  title text not null,
  revision_id bigint not null,
  sanitized_html text not null,
  fetched_at timestamptz not null default now(),
  primary key (title, revision_id)
);

-- MVP-stage RLS: there's no real auth system yet (M4) — players are
-- identified only by a client-generated guest_id, not a Supabase Auth
-- user, so policies can't check auth.uid(). Open read/write for now;
-- tighten once M4 lands real accounts.
alter table lobbies enable row level security;
alter table lobby_members enable row level security;
alter table races enable row level security;
alter table race_participants enable row level security;
alter table race_hops enable row level security;
alter table cached_articles enable row level security;

create policy "public read lobbies" on lobbies for select using (true);
create policy "public insert lobbies" on lobbies for insert with check (true);
create policy "public update lobbies" on lobbies for update using (true);

create policy "public read lobby_members" on lobby_members for select using (true);
create policy "public insert lobby_members" on lobby_members for insert with check (true);
create policy "public update lobby_members" on lobby_members for update using (true);
create policy "public delete lobby_members" on lobby_members for delete using (true);

create policy "public read races" on races for select using (true);
create policy "public insert races" on races for insert with check (true);
create policy "public update races" on races for update using (true);

create policy "public read race_participants" on race_participants for select using (true);
create policy "public insert race_participants" on race_participants for insert with check (true);
create policy "public update race_participants" on race_participants for update using (true);

create policy "public read race_hops" on race_hops for select using (true);
create policy "public insert race_hops" on race_hops for insert with check (true);

create policy "public read cached_articles" on cached_articles for select using (true);
create policy "public insert cached_articles" on cached_articles for insert with check (true);
create policy "public update cached_articles" on cached_articles for update using (true);
