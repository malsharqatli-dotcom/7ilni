-- Renaming a team means updating every teammate's lobby_members row, not
-- just the caller's own — lobby_members' RLS only allows updating your own
-- row (auth.uid() = user_id), so this needs the same security-definer
-- pattern as the race-time team RPCs (0007_team_advance_functions.sql).
-- Any lobby member can rename either team (casual party-game feature, not
-- access-controlled per team) as long as they're actually in that lobby.

create or replace function public.rename_lobby_team(
  p_lobby_id uuid,
  p_old_name text,
  p_new_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from lobby_members
    where lobby_id = p_lobby_id and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this lobby';
  end if;

  update lobby_members
  set team_name = p_new_name
  where lobby_id = p_lobby_id and team_name = p_old_name;
end;
$$;
