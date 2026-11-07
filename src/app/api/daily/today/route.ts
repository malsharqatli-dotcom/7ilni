import { NextResponse } from "next/server";
import { getOrCreateTodayChallenge } from "@/lib/daily/get-today-challenge";

export async function GET() {
  const challenge = await getOrCreateTodayChallenge();
  if (!challenge) {
    return NextResponse.json({ error: "No articles available to build today's challenge" }, { status: 500 });
  }
  return NextResponse.json(challenge);
}
