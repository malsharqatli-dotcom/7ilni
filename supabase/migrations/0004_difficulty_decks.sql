create table if not exists article_metadata (
  title text primary key,
  word_count int not null,
  in_article_link_count int not null,
  link_density numeric not null,
  difficulty_tier text not null check (difficulty_tier in ('easy','medium','hard')),
  scored_at timestamptz not null default now()
);

create table if not exists category_decks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  icon text not null,
  is_active boolean not null default true
);

create table if not exists deck_articles (
  deck_id uuid not null references category_decks(id) on delete cascade,
  article_title text not null references article_metadata(title),
  primary key (deck_id, article_title)
);

alter table article_metadata enable row level security;
alter table category_decks enable row level security;
alter table deck_articles enable row level security;

-- Content tables, not user data — reads are open; writes are done by me
-- directly via the SQL editor (seed scripts generate INSERT statements),
-- not from the app, so no insert/update policy is needed here.
create policy "public read article_metadata" on article_metadata for select using (true);
create policy "public read category_decks" on category_decks for select using (true);
create policy "public read deck_articles" on deck_articles for select using (true);
