import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import RaceView from "@/components/RaceView";

export default async function RacePage(props: PageProps<"/race/[id]">) {
  const { id } = await props.params;

  const { data: race, error } = await supabase
    .from("races")
    .select("id, start_title, destination_title, started_at, stage_pairs")
    .eq("id", id)
    .single();

  if (error || !race) notFound();

  const { data: participants } = await supabase
    .from("race_participants")
    .select("user_id, display_name, status, hop_count, finish_rank, team_name, current_stage_index, current_title")
    .eq("race_id", id);

  return (
    <RaceView
      raceId={race.id}
      startTitle={race.start_title}
      destinationTitle={race.destination_title}
      startedAt={race.started_at}
      stagePairs={race.stage_pairs}
      initialParticipants={participants ?? []}
    />
  );
}
