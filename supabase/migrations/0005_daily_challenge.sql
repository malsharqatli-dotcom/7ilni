create table if not exists daily_challenges (
  challenge_date date primary key,
  start_title text not null references article_metadata(title),
  destination_title text not null references article_metadata(title),
  difficulty_tier text,
  created_at timestamptz not null default now()
);

create table if not exists daily_leaderboard (
  challenge_date date not null references daily_challenges(challenge_date),
  user_id uuid not null references users(id) on delete cascade,
  display_name text not null,
  hop_count int not null,
  time_seconds int not null,
  completed_at timestamptz not null default now(),
  primary key (challenge_date, user_id)
);

alter table daily_challenges enable row level security;
alter table daily_leaderboard enable row level security;

-- daily_challenges is system-generated (lazily, by the first visitor of
-- the day hitting /api/daily/today), not owned by any one user — open
-- insert, same posture as article_metadata/category_decks.
create policy "public read daily_challenges" on daily_challenges for select using (true);
create policy "public insert daily_challenges" on daily_challenges for insert with check (true);

create policy "public read daily_leaderboard" on daily_leaderboard for select using (true);
create policy "users can insert own leaderboard row" on daily_leaderboard for insert with check (auth.uid() = user_id);
