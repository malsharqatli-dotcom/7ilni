-- Wipes M3's test data: the guest_id values in these rows are client-
-- generated UUIDs with no corresponding auth.users row, so they'd violate
-- the foreign keys added below. Fine to drop — it's all QA data.
truncate table lobbies cascade;
truncate table races cascade;

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_guest boolean not null default true,
  created_at timestamptz not null default now()
);

alter table users enable row level security;
create policy "users readable by anyone" on users for select using (true);
create policy "users can insert own row" on users for insert with check (auth.uid() = id);
create policy "users can update own row" on users for update using (auth.uid() = id);

-- Auto-create a public.users row for every new Supabase Auth user —
-- covers both anonymous sign-in and real signup, so game data always has
-- a users row to reference.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, is_guest)
  values (new.id, 'لاعب', coalesce(new.is_anonymous, true));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Keep is_guest in sync when an anonymous session is upgraded to a real
-- account (auth.users.is_anonymous flips to false on that upgrade).
create or replace function public.handle_auth_user_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set is_guest = coalesce(new.is_anonymous, false) where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_auth_user_update();

-- Every player (guest or real) now has a stable auth.users-backed id, so
-- rename these columns from the ad-hoc "guest_id" and point them at it.
alter table lobbies rename column host_guest_id to host_user_id;
alter table lobby_members rename column guest_id to user_id;
alter table race_participants rename column guest_id to user_id;
alter table race_hops rename column guest_id to user_id;

alter table lobby_members
  add constraint lobby_members_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table race_participants
  add constraint race_participants_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table race_hops
  add constraint race_hops_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

-- Tighten the open-for-everyone policies from M3 now that auth.uid() is
-- real: writes are scoped to the acting user (or, for races, to the
-- lobby's host). Reads stay open — joining a lobby by code, or seeing
-- live standings, both need visibility into rows you don't own yet.
drop policy if exists "public insert lobbies" on lobbies;
drop policy if exists "public update lobbies" on lobbies;
create policy "host can insert own lobby" on lobbies for insert with check (auth.uid() = host_user_id);
create policy "host can update own lobby" on lobbies for update using (auth.uid() = host_user_id);

drop policy if exists "public insert lobby_members" on lobby_members;
drop policy if exists "public update lobby_members" on lobby_members;
drop policy if exists "public delete lobby_members" on lobby_members;
create policy "members can insert own membership" on lobby_members for insert with check (auth.uid() = user_id);
create policy "members can update own membership" on lobby_members for update using (auth.uid() = user_id);
create policy "members can delete own membership" on lobby_members for delete using (auth.uid() = user_id);

drop policy if exists "public insert races" on races;
drop policy if exists "public update races" on races;
create policy "host can insert race for own lobby" on races for insert
  with check (auth.uid() = (select host_user_id from lobbies where id = lobby_id));
create policy "host can update race for own lobby" on races for update
  using (auth.uid() = (select host_user_id from lobbies where id = lobby_id));

drop policy if exists "public insert race_participants" on race_participants;
drop policy if exists "public update race_participants" on race_participants;
create policy "participants can insert own row" on race_participants for insert with check (auth.uid() = user_id);
create policy "participants can update own row" on race_participants for update using (auth.uid() = user_id);

drop policy if exists "public insert race_hops" on race_hops;
create policy "participants can insert own hops" on race_hops for insert with check (auth.uid() = user_id);
