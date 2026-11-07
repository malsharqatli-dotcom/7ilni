import { createClient } from "@supabase/supabase-js";

// Route handlers run server-side with the plain anon-key client, which
// has no session — RLS policies checking auth.uid() would always see
// null. Forwarding the caller's bearer token (from their Supabase Auth
// session) makes auth.uid() resolve to the real signed-in user instead.
export function createAuthedClient(authHeader: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader ?? "" } } },
  );
}
