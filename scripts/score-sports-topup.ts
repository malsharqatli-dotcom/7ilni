// Targeted top-up: sports+easy was the thinnest combo in the variety
// check (5 articles, 10 pairs — passes the floor but with no margin).
// These are broad, well-connected sports hub articles likely to land
// in the easy tier and give that specific combo real breathing room.
import { writeFileSync } from "node:fs";

const USER_AGENT = "7ilni/1.0 (7ilni.app@gmail.com) Node.js";
const BYTES_PER_WORD = 8;

const CANDIDATES = [
  "Baseball", "American football", "Ice hockey", "Gymnastics",
  "UEFA Champions League", "Wimbledon Championships", "Super Bowl",
  "Marathon", "Sport", "Rowing (sport)",
];

type Metadata = { title: string; wordCount: number; linkCount: number };
type WikiApiPage = { title: string; missing?: boolean; length?: number; links?: unknown[] };
type WikiApiResponse = { query?: { pages?: WikiApiPage[] }; continue?: Record<string, string> };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBatch(titles: string[]): Promise<Map<string, Metadata>> {
  const map = new Map<string, Metadata>();
  const linkCounts = new Map<string, number>();
  let plcontinue: string | undefined;

  do {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("prop", "info|links");
    url.searchParams.set("pllimit", "500");
    url.searchParams.set("plnamespace", "0");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("titles", titles.join("|"));
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    if (plcontinue) url.searchParams.set("plcontinue", plcontinue);

    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const data = (await res.json()) as WikiApiResponse;

    for (const page of data.query?.pages ?? []) {
      if (page.missing) continue;
      linkCounts.set(page.title, (linkCounts.get(page.title) ?? 0) + (page.links?.length ?? 0));
      if (page.length !== undefined && !map.has(page.title)) {
        map.set(page.title, { title: page.title, wordCount: Math.round(page.length / BYTES_PER_WORD), linkCount: 0 });
      }
    }
    plcontinue = data.continue?.plcontinue;
    if (plcontinue) await sleep(1000);
  } while (plcontinue);

  for (const [title, entry] of map) entry.linkCount = linkCounts.get(title) ?? 0;
  return map;
}

function classify(wordCount: number, linkDensity: number): "easy" | "medium" | "hard" {
  if (wordCount > 3000 && linkDensity > 8) return "easy";
  if (wordCount >= 1000 && wordCount <= 3000 && linkDensity >= 4 && linkDensity <= 8) return "medium";
  if (wordCount < 1000 || linkDensity < 4) return "hard";
  return "medium";
}

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

async function main() {
  const batchResults = await fetchBatch(CANDIDATES);
  const results = [...batchResults.values()];

  const rows = results.map((r) => {
    const linkDensity = r.linkCount / (r.wordCount / 100);
    const tier = classify(r.wordCount, linkDensity);
    return { ...r, linkDensity, tier };
  });

  for (const r of rows) console.log(`  ${r.title}: ${r.wordCount} words, density ${r.linkDensity.toFixed(2)}, ${r.tier}`);

  const sql = [
    "insert into article_metadata (title, word_count, in_article_link_count, link_density, difficulty_tier) values",
    rows
      .map((r) => `  ('${sqlEscape(r.title)}', ${r.wordCount}, ${r.linkCount}, ${r.linkDensity.toFixed(2)}, '${r.tier}')`)
      .join(",\n"),
    "on conflict (title) do update set",
    "  word_count = excluded.word_count,",
    "  in_article_link_count = excluded.in_article_link_count,",
    "  link_density = excluded.link_density,",
    "  difficulty_tier = excluded.difficulty_tier,",
    "  scored_at = now();",
    "",
    "insert into deck_articles (deck_id, article_title) values",
    rows
      .map((r) => `  ((select id from category_decks where slug = 'sports'), '${sqlEscape(r.title)}')`)
      .join(",\n"),
    "on conflict do nothing;",
  ].join("\n");

  writeFileSync("supabase/seed/0006_sports_topup.sql", sql + "\n");
  console.log(`\nWrote supabase/seed/0006_sports_topup.sql (${rows.length} articles)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
