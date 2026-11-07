import { supabase } from "@/lib/supabase/client";

// Every visitor gets a real Supabase Auth user — anonymous at first, so
// there's always a stable id for lobby_members/race_participants/race_hops
// to reference. Signing up with email/password later upgrades this same
// session in place (see upgradeToRealAccount) rather than creating a new
// user, so a guest's race history isn't thrown away.
export async function ensureUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user.id;

  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error || !signInData.user) {
    throw new Error(error?.message ?? "Failed to start a session");
  }
  return signInData.user.id;
}

export async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session ? `Bearer ${data.session.access_token}` : "";
}

export async function isGuestSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.is_anonymous ?? true;
}
