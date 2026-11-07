import { createClient } from "@supabase/supabase-js";

// No Supabase Auth sessions yet (that's M4) so one plain client, usable
// from both server and client code, is enough — nothing here needs
// cookie-aware request scoping.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
