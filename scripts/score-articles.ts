// Offline, one-off (re-run periodically, not per-request): scores a pool
// of candidate Wikipedia titles by length + in-article link density, then
// writes the result as SQL INSERT statements to paste into Supabase's SQL
// Editor. Simplified from the original plan's "scrape Wikipedia:Vital
// Articles" idea — this is a hand-picked list of broadly-notable titles
// across varied topics (skewed toward a Jordanian/Arab audience where it
// doesn't cost real-world breadth), which gets the same practical result
// — a pool of well-known, well-connected hub articles — without needing
// to scrape and parse Vital Articles list pages.
//
// Word count is approximated from prop=info's wikitext byte length
// (length / 8, a rough bytes-per-word-including-markup-overhead factor)
// rather than fetching full prop=extracts text: explaintext extracts are
// subject to an internal response-size cutoff that silently truncates a
// multi-title batch to whichever single page's extract fits first, which
// made every batch during development only "see" 1 of 3 requested titles.
// info+links are both small, fixed-shape fields with no such truncation.
import { writeFileSync } from "node:fs";

const USER_AGENT = "7ilni/0.1 (https://example.com/7ilni; contact@example.com) Node.js";
const BATCH_SIZE = 10;
const DELAY_MS = 3000;
const RETRY_DELAY_MS = 15000;
const BYTES_PER_WORD = 8;

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

type WikiApiPage = {
  title: string;
  missing?: boolean;
  length?: number;
  links?: unknown[];
};

type WikiApiResponse = {
  query?: { pages?: WikiApiPage[] };
  continue?: Record<string, string>;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function fetchJson(url: URL): Promise<WikiApiResponse | null> {
  let result = await fetchJsonOnce(url);
  if (!result.ok) {
    console.warn(`  non-JSON response (status ${result.status}): ${result.text?.slice(0, 80)}`);
    console.warn(`  retrying after ${RETRY_DELAY_MS}ms...`);
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

  // info (byte length) + links together — both lightweight, fixed-shape
  // fields, no response-size truncation risk the way extracts had.
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
  } while (plcontinue);

  for (const [title, entry] of map) {
    entry.linkCount = linkCounts.get(title) ?? 0;
  }

  for (const title of titles) {
    if (![...map.keys()].some((found) => found === title)) {
      console.warn(`  skipped (not found): ${title}`);
    }
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

  writeFileSync("supabase/seed/0001_article_metadata.sql", sql + "\n");
  console.log(`\nWrote supabase/seed/0001_article_metadata.sql (${rows.length} articles)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
