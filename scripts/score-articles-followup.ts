// One-off follow-up for the ~35 titles that came back with 0 links (a
// failed continuation call after a partial success) or were fully
// skipped (double 429) in the first scoring pass. Same logic as
// score-articles.ts, just a smaller list and slower pacing.
import { writeFileSync } from "node:fs";

const USER_AGENT = "7ilni/1.0 (7ilni.app@gmail.com) Node.js";
const BATCH_SIZE = 4;
const DELAY_MS = 6000;
const RETRY_DELAY_MS = 20000;
const BYTES_PER_WORD = 8;

const CANDIDATES = [
  "Germany", "India", "Japan", "Russia", "United Kingdom", "United States",
  "Australia", "France", "Industrial Revolution", "Roman Empire",
  "Abbasid Caliphate", "Cold War", "Crusades", "Byzantine Empire",
  "Arab Spring", "Islamic Golden Age", "Language", "Mathematics", "Music",
  "Water", "Hummus", "Falafel", "Human", "Philosophy", "Knafeh",
  "One Thousand and One Nights", "Arabic literature", "FIFA World Cup",
  "Olympic Games", "Lionel Messi", "Cristiano Ronaldo", "Mohamed Salah",
  "Association football", "Basketball", "Real Madrid CF",
];

type Metadata = { title: string; wordCount: number; linkCount: number };
type WikiApiPage = { title: string; missing?: boolean; length?: number; links?: unknown[] };
type WikiApiResponse = { query?: { pages?: WikiApiPage[] }; continue?: Record<string, string> };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonOnce(url: URL) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  const text = await res.text();
  try {
    return { ok: true, status: res.status, data: JSON.parse(text) as WikiApiResponse };
  } catch {
    return { ok: false, status: res.status, text };
  }
}

async function fetchJson(url: URL): Promise<WikiApiResponse | null> {
  let result = await fetchJsonOnce(url);
  if (!result.ok) {
    console.warn(`  non-JSON response (status ${result.status}), retrying after ${RETRY_DELAY_MS}ms...`);
    await sleep(RETRY_DELAY_MS);
    result = await fetchJsonOnce(url);
    if (!result.ok) {
      console.warn(`  retry failed (status ${result.status})`);
      return null;
    }
  }
  return result.data ?? null;
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

    const data = await fetchJson(url);
    if (!data) break;

    for (const page of data.query?.pages ?? []) {
      if (page.missing) continue;
      linkCounts.set(page.title, (linkCounts.get(page.title) ?? 0) + (page.links?.length ?? 0));
      if (page.length !== undefined && !map.has(page.title)) {
        map.set(page.title, { title: page.title, wordCount: Math.round(page.length / BYTES_PER_WORD), linkCount: 0 });
      }
    }
    plcontinue = data.continue?.plcontinue;
    if (plcontinue) await sleep(DELAY_MS);
  } while (plcontinue);

  for (const [title, entry] of map) entry.linkCount = linkCounts.get(title) ?? 0;

  for (const title of titles) {
    if (![...map.keys()].includes(title)) console.warn(`  still missing: ${title}`);
  }

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
  const results: Metadata[] = [];
  const batches = chunk(CANDIDATES, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    console.log(`batch ${i + 1}/${batches.length}: ${batches[i].join(", ")}`);
    const batchResults = await fetchBatch(batches[i]);
    for (const [title, entry] of batchResults) {
      if (entry.linkCount > 0) results.push(entry);
      else console.warn(`  still zero links, dropping: ${title}`);
    }
    console.log(`  scored ${results.length} usable so far`);
    await sleep(DELAY_MS);
  }

  const rows = results.map((r) => {
    const linkDensity = r.linkCount / (r.wordCount / 100);
    const tier = classify(r.wordCount, linkDensity);
    return { ...r, linkDensity, tier };
  });

  const tierCounts = { easy: 0, medium: 0, hard: 0 };
  for (const row of rows) tierCounts[row.tier]++;
  console.log("\nTier distribution:", tierCounts);

  const sql = [
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

  writeFileSync("supabase/seed/0002_article_metadata_followup.sql", sql + "\n");
  console.log(`\nWrote supabase/seed/0002_article_metadata_followup.sql (${rows.length} articles)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
