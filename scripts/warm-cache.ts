// One-time (re-run after deploys or whenever article_metadata grows): hits
// /api/wiki/article for every scored-pool title so it's already sitting in
// cached_articles before a single real player loads it. Since every title
// a race can start/end on — difficulty-tier picks, deck picks, and manual
// picks — comes from this same pool, this is what keeps live player
// traffic from ever touching Wikipedia for anything but genuinely novel
// in-article hops, which is the real lever for staying well under
// Wikipedia's rate limit as player count grows.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://odccxcylsjyvpajtdmlc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4vQXqvVwgKJfRw816KhrCA_VU2i5Rcs";
const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.from("article_metadata").select("title");
  if (error || !data) throw new Error(`Failed to list article_metadata: ${error?.message}`);

  console.log(`Warming ${data.length} articles against ${BASE_URL}...`);

  let ok = 0;
  let failed = 0;
  for (const { title } of data) {
    try {
      const res = await fetch(`${BASE_URL}/api/wiki/article?title=${encodeURIComponent(title)}`);
      if (res.ok) {
        ok++;
      } else {
        failed++;
        console.warn(`  ${title}: HTTP ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.warn(`  ${title}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`Done. ${ok} cached, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
