-- race_participants' RLS only allows a user to update their OWN row
-- (auth.uid() = user_id), but teams mode needs one player finishing a
-- stage to advance every teammate's row. These security-definer
-- functions do that update with elevated privilege, after checking the
-- caller is actually a member of that race+team — so a user still can't
-- advance a team they're not on, even though the function itself bypasses
-- the per-row RLS check.

create or replace function public.advance_team_stage(
  p_race_id uuid,
  p_team_name text,
  p_next_stage_index int,
  p_next_stage_start text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from race_participants
    where race_id = p_race_id and team_name = p_team_name and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this team';
  end if;

  update race_participants
  set current_stage_index = p_next_stage_index,
      current_title = p_next_stage_start,
      hop_count = 0
  where race_id = p_race_id and team_name = p_team_name;
end;
$$;

create or replace function public.finish_team(
  p_race_id uuid,
  p_team_name text,
  p_finish_rank int,
  p_final_title text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from race_participants
    where race_id = p_race_id and team_name = p_team_name and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this team';
  end if;

  update race_participants
  set status = 'finished',
      finished_at = now(),
      finish_rank = p_finish_rank,
      current_title = p_final_title
  where race_id = p_race_id and team_name = p_team_name;
end;
$$;
