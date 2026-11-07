// Offline, one-off (re-run periodically, not per-request): scores a pool
// of candidate Wikipedia titles by length + in-article link density, then
// writes the result as SQL INSERT statements to paste into Supabase's SQL
// Editor. Simplified from the original plan's "scrape Wikipedia:Vital
// Articles" idea — this is a hand-picked list of broadly-notable titles
// across varied topics (skewed toward a Jordanian/Arab audience where it
// doesn't cost real-world breadth), which gets the same practical result
// — a pool of well-known, well-connected hub articles — without needing
// to scrape and parse Vital Articles list pages.
import { writeFileSync } from "node:fs";

const USER_AGENT = "7ilni/0.1 (https://example.com/7ilni; contact@example.com) Node.js";
const BATCH_SIZE = 3;
const DELAY_MS = 4000;
const RETRY_DELAY_MS = 15000;

const CANDIDATES = [
  // Geography / countries
  "Jordan", "Egypt", "Saudi Arabia", "United Arab Emirates", "Lebanon", "Syria",
  "Iraq", "Palestine", "Israel", "Turkey", "France", "Germany", "United Kingdom",
  "United States", "China", "Japan", "India", "Brazil", "Russia", "Australia",
  "Canada", "Italy", "Spain", "Greece", "Morocco", "Tunisia", "Algeria", "Kuwait",
  "Qatar", "Yemen",
  // Jordan-specific / landmarks (likely narrower, good Hard-tier candidates)
  "Petra", "Wadi Rum", "Dead Sea", "Amman", "Aqaba", "Jerash", "Umm Qais",
  "Mount Everest", "Nile", "Amazon River", "Sahara", "Red Sea", "Suez Canal",
  "Great Wall of China", "Taj Mahal", "Eiffel Tower", "Statue of Liberty",
  // History
  "World War II", "World War I", "Ottoman Empire", "Roman Empire",
  "Ancient Egypt", "Islamic Golden Age", "Cold War", "French Revolution",
  "Industrial Revolution", "Arab Spring", "Crusades", "Byzantine Empire",
  "Abbasid Caliphate", "Umayyad Caliphate",
  // Science
  "Albert Einstein", "Isaac Newton", "Charles Darwin", "Marie Curie",
  "Theory of relativity", "Quantum mechanics", "DNA", "Periodic table",
  "Solar System", "Black hole", "Evolution", "Photosynthesis",
  "Theoretical physics", "Mitochondria", "Higgs boson", "Large Hadron Collider",
  // Technology
  "Internet", "Artificial intelligence", "Python (programming language)",
  "Computer", "Smartphone", "World Wide Web", "Machine learning",
  // Arts / culture
  "William Shakespeare", "Leonardo da Vinci", "Pablo Picasso",
  "Wolfgang Amadeus Mozart", "Renaissance", "Islamic art",
  "One Thousand and One Nights", "Arabic literature",
  // Sports
  "FIFA World Cup", "Olympic Games", "Lionel Messi", "Cristiano Ronaldo",
  "Mohamed Salah", "Association football", "Basketball", "Real Madrid CF",
  "FC Barcelona",
  // Celebrities / notable people (Arab-relevant)
  "Mohammed bin Salman", "Abdullah II of Jordan", "Fairuz", "Umm Kulthum",
  "Naguib Mahfouz", "Mahmoud Darwish", "Amr Diab",
  // Religion / philosophy
  "Islam", "Christianity", "Judaism", "Muhammad", "Jesus", "Quran", "Bible",
  // Everyday / culture (likely narrower)
  "Chess", "Backgammon", "Falconry", "Bedouin", "Keffiyeh", "Hummus",
  "Falafel", "Knafeh",
  // Broad hub topics
  "Human", "Earth", "Water", "Music", "Language", "Philosophy",
  "Mathematics", "Chemistry", "Biology", "Physics", "Geography",
  "Democracy", "Economics",
];

type Metadata = {
  title: string;
  wordCount: number;
  linkCount: number;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type WikiApiPage = {
  title: string;
  missing?: boolean;
  extract?: string;
  links?: unknown[];
};

type WikiApiResponse = {
  query?: { pages?: WikiApiPage[] };
  continue?: Record<string, string>;
};

async function fetchJsonOnce(
  url: URL,
): Promise<{ ok: boolean; status: number; data?: WikiApiResponse; text?: string }> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  const text = await res.text();
  try {
    return { ok: true, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: res.status, text };
  }
}

async function fetchJson(url: URL, label: string): Promise<WikiApiResponse | null> {
  let result = await fetchJsonOnce(url);
  if (!result.ok) {
    console.warn(`  non-JSON response for ${label} (status ${result.status}): ${result.text?.slice(0, 80)}`);
    console.warn(`  retrying ${label} after ${RETRY_DELAY_MS}ms...`);
    await sleep(RETRY_DELAY_MS);
    result = await fetchJsonOnce(url);
    if (!result.ok) {
      console.warn(`  retry failed for ${label} (status ${result.status})`);
      return null;
    }
  }
  return result.data ?? null;
}

async function fetchBatch(titles: string[]): Promise<Map<string, Metadata>> {
  const map = new Map<string, Metadata>();

  const wordUrl = new URL("https://en.wikipedia.org/w/api.php");
  wordUrl.searchParams.set("action", "query");
  wordUrl.searchParams.set("prop", "extracts");
  wordUrl.searchParams.set("explaintext", "1");
  // prop=extracts defaults to returning only ONE page's extract per call
  // regardless of how many titles you pass — exlimit raises that (20 is
  // the max for non-bot requests), which is why batches were only
  // scoring 1-of-N titles.
  wordUrl.searchParams.set("exlimit", "20");
  wordUrl.searchParams.set("titles", titles.join("|"));
  wordUrl.searchParams.set("format", "json");
  wordUrl.searchParams.set("formatversion", "2");

  const wordData = await fetchJson(wordUrl, "extracts");
  await sleep(DELAY_MS);

  const linkUrl = new URL("https://en.wikipedia.org/w/api.php");
  linkUrl.searchParams.set("action", "query");
  linkUrl.searchParams.set("prop", "links");
  linkUrl.searchParams.set("pllimit", "500");
  linkUrl.searchParams.set("plnamespace", "0");
  linkUrl.searchParams.set("titles", titles.join("|"));
  linkUrl.searchParams.set("format", "json");
  linkUrl.searchParams.set("formatversion", "2");

  const linkData = await fetchJson(linkUrl, "links");
  await sleep(DELAY_MS);

  if (!wordData || !linkData) return map;

  const wordCounts = new Map<string, number>();
  for (const page of wordData.query?.pages ?? []) {
    if (page.missing || !page.extract) continue;
    wordCounts.set(page.title, page.extract.trim().split(/\s+/).length);
  }

  const linkCounts = new Map<string, number>();
  for (const page of linkData.query?.pages ?? []) {
    if (page.missing) continue;
    linkCounts.set(page.title, page.links?.length ?? 0);
  }

  for (const title of titles) {
    const wordCount = wordCounts.get(title);
    const linkCount = linkCounts.get(title);
    if (wordCount === undefined || linkCount === undefined) {
      console.warn(`  skipped (not found): ${title}`);
      continue;
    }
    map.set(title, { title, wordCount, linkCount });
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
    results.push(...batchResults.values());
    console.log(`  scored ${results.length}/${CANDIDATES.length} so far`);
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

  writeFileSync("supabase/seed/0001_article_metadata.sql", sql + "\n");
  console.log(`\nWrote supabase/seed/0001_article_metadata.sql (${rows.length} articles)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
