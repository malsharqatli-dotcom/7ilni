import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import RaceView from "@/components/RaceView";

export default async function RacePage(props: PageProps<"/race/[id]">) {
  const { id } = await props.params;

  const { data: race, error } = await supabase
    .from("races")
    .select("id, start_title, destination_title, started_at")
    .eq("id", id)
    .single();

  if (error || !race) notFound();

  const { data: participants } = await supabase
    .from("race_participants")
    .select("guest_id, display_name, status, hop_count, finish_rank")
    .eq("race_id", id);

  return (
    <RaceView
      raceId={race.id}
      startTitle={race.start_title}
      destinationTitle={race.destination_title}
      startedAt={race.started_at}
      initialParticipants={participants ?? []}
    />
  );
}
