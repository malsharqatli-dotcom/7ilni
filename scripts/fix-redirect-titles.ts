// score-articles-batch2.ts didn't pass redirects=1, so any candidate title
// that's actually a redirect page got scored on the REDIRECT STUB's own
// tiny wikitext ("#REDIRECT [[Target]]", ~1-3 words) instead of the real
// target article — these 8 slipped through with absurd word counts. This
// re-fetches each with redirects resolved and replaces the bad row with
// one for the real target title (which is what players actually land on
// and what in-article links actually point to).
import { writeFileSync, readFileSync } from "node:fs";

const USER_AGENT = "7ilni/1.0 (7ilni.app@gmail.com) Node.js";
const BYTES_PER_WORD = 8;
const OUTPUT_PATH = "supabase/seed/0004_article_metadata_batch2.sql";

const BROKEN_TITLES = [
  "Human heart", "Hurricane", "Hip hop music", "Rania of Jordan",
  "Khalil Gibran", "Dates (fruit)", "Arabic language", "Automobile",
];

type WikiApiPage = { title: string; missing?: boolean; length?: number; links?: unknown[] };
type WikiApiResponse = {
  query?: { pages?: WikiApiPage[]; redirects?: { from: string; to: string }[] };
  continue?: Record<string, string>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchResolved(title: string): Promise<{ resolvedTitle: string; wordCount: number; linkCount: number } | null> {
  let plcontinue: string | undefined;
  let resolvedTitle = title;
  let wordCount = 0;
  let linkCount = 0;

  do {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("prop", "info|links");
    url.searchParams.set("pllimit", "500");
    url.searchParams.set("plnamespace", "0");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("titles", title);
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    if (plcontinue) url.searchParams.set("plcontinue", plcontinue);

    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const data = (await res.json()) as WikiApiResponse;

    const redirect = data.query?.redirects?.[0];
    if (redirect) resolvedTitle = redirect.to;

    const page = data.query?.pages?.[0];
    if (page && !page.missing) {
      if (page.length !== undefined) wordCount = Math.round(page.length / BYTES_PER_WORD);
      linkCount += page.links?.length ?? 0;
      resolvedTitle = page.title;
    }
    plcontinue = data.continue?.plcontinue;
    if (plcontinue) await sleep(1000);
  } while (plcontinue);

  if (wordCount === 0) return null;
  return { resolvedTitle, wordCount, linkCount };
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
  const fixed: { title: string; wordCount: number; linkCount: number; linkDensity: number; tier: string }[] = [];

  for (const title of BROKEN_TITLES) {
    const result = await fetchResolved(title);
    if (!result) {
      console.warn(`  could not resolve: ${title}`);
      continue;
    }
    const linkDensity = result.linkCount / (result.wordCount / 100);
    const tier = classify(result.wordCount, linkDensity);
    console.log(`  ${title} -> ${result.resolvedTitle} (${result.wordCount} words, density ${linkDensity.toFixed(2)}, ${tier})`);
    fixed.push({ title: result.resolvedTitle, wordCount: result.wordCount, linkCount: result.linkCount, linkDensity, tier });
    await sleep(1000);
  }

  // Remove the 8 broken rows from the existing file, then append corrected
  // rows for their resolved titles (which may already exist in the pool
  // under a different name — on conflict (title) just refreshes them).
  let sql = readFileSync(OUTPUT_PATH, "utf-8");
  for (const title of BROKEN_TITLES) {
    const escaped = sqlEscape(title);
    sql = sql.replace(new RegExp(`\\s*\\('${escaped}', \\d+, \\d+, [\\d.]+, '\\w+'\\),?\\n`), "\n");
  }

  const fixedSql = [
    "insert into article_metadata (title, word_count, in_article_link_count, link_density, difficulty_tier) values",
    fixed
      .map((r) => `  ('${sqlEscape(r.title)}', ${r.wordCount}, ${r.linkCount}, ${r.linkDensity.toFixed(2)}, '${r.tier}')`)
      .join(",\n"),
    "on conflict (title) do update set",
    "  word_count = excluded.word_count,",
    "  in_article_link_count = excluded.in_article_link_count,",
    "  link_density = excluded.link_density,",
    "  difficulty_tier = excluded.difficulty_tier,",
    "  scored_at = now();",
  ].join("\n");

  writeFileSync(OUTPUT_PATH, sql.trimEnd() + "\n\n" + fixedSql + "\n");
  console.log(`\nFixed ${fixed.length}/${BROKEN_TITLES.length} redirect titles in ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
