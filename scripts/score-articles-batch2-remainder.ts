// The last tiny batch of score-articles-batch2.ts's run hit a hung
// connection (no response, no error, no timeout) on Wikipedia's end — this
// re-scores just those 7 straggler titles and appends to the same output
// file rather than re-running the whole 247-title batch again.
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const USER_AGENT = "7ilni/1.0 (7ilni.app@gmail.com) Node.js";
const BYTES_PER_WORD = 8;
const OUTPUT_PATH = "supabase/seed/0004_article_metadata_batch2.sql";

const CANDIDATES = ["Agriculture", "Transport", "Automobile", "Airplane", "Ship", "Train", "Bicycle"];

type Metadata = { title: string; wordCount: number; linkCount: number };
type WikiApiPage = { title: string; missing?: boolean; length?: number; links?: unknown[] };
type WikiApiResponse = { query?: { pages?: WikiApiPage[] }; continue?: Record<string, string> };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: URL, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
    url.searchParams.set("titles", titles.join("|"));
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    if (plcontinue) url.searchParams.set("plcontinue", plcontinue);

    let data: WikiApiResponse | null = null;
    for (let attempt = 1; attempt <= 3 && !data; attempt++) {
      try {
        const res = await fetchWithTimeout(url, 10000);
        data = (await res.json()) as WikiApiResponse;
      } catch (err) {
        console.warn(`  attempt ${attempt}/3 failed: ${(err as Error).message}`);
        if (attempt < 3) await sleep(5000);
      }
    }
    if (!data) break;

    for (const page of data.query?.pages ?? []) {
      if (page.missing) continue;
      linkCounts.set(page.title, (linkCounts.get(page.title) ?? 0) + (page.links?.length ?? 0));
      if (page.length !== undefined && !map.has(page.title)) {
        map.set(page.title, { title: page.title, wordCount: Math.round(page.length / BYTES_PER_WORD), linkCount: 0 });
      }
    }
    plcontinue = data.continue?.plcontinue;
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
  console.log(`Scoring remainder: ${CANDIDATES.join(", ")}`);
  const batchResults = await fetchBatch(CANDIDATES);
  const results = [...batchResults.values()];
  console.log(`Scored ${results.length}/${CANDIDATES.length}`);

  if (results.length === 0) {
    console.log("Nothing scored, leaving existing file untouched.");
    return;
  }

  const rows = results.map((r) => {
    const linkDensity = r.linkCount / (r.wordCount / 100);
    const tier = classify(r.wordCount, linkDensity);
    return { ...r, linkDensity, tier };
  });

  const newSql = [
    "insert into article_metadata (title, word_count, in_article_link_count, link_density, difficulty_tier) values",
    rows
      .map(
        (r) =>
          `  ('${sqlEscape(r.title)}', ${r.wordCount}, ${r.linkCount}, ${r.linkDensity.toFixed(2)}, '${r.tier}')`,
      )
      .join(",\n"),
    "on conflict (title) do update set",
    "  word_count = excluded.word_count,",
    "  in_article_link_count = excluded.in_article_link_count,",
    "  link_density = excluded.link_density,",
    "  difficulty_tier = excluded.difficulty_tier,",
    "  scored_at = now();",
  ].join("\n");

  const existing = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, "utf-8") : "";
  writeFileSync(OUTPUT_PATH, existing + "\n" + newSql + "\n");
  console.log(`Appended ${rows.length} rows to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
