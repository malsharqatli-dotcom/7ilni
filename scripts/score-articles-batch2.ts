// Second content-expansion pass — same logic as score-articles.ts, just a
// much bigger, fresh set of candidate titles to grow the pool well beyond
// the original 136 (more titles = exponentially more possible start/
// destination pairs at every difficulty tier, and a bigger candidate pool
// for every deck and the manual picker). Safe to re-run: article_metadata's
// upsert is keyed on title, so any overlap with the first batch just
// refreshes that row instead of duplicating it.
import { writeFileSync } from "node:fs";

const USER_AGENT = "7ilni/1.0 (7ilni.app@gmail.com) Node.js";
const BATCH_SIZE = 10;
const DELAY_MS = 3000;
const RETRY_DELAY_MS = 15000;
const BYTES_PER_WORD = 8;

const CANDIDATES = [
  // More countries
  "Pakistan", "Indonesia", "Malaysia", "Bangladesh", "Nigeria", "South Africa",
  "Kenya", "Ethiopia", "Mexico", "Argentina", "Chile", "Colombia", "Peru",
  "Sweden", "Norway", "Finland", "Denmark", "Netherlands", "Belgium",
  "Switzerland", "Austria", "Poland", "Portugal", "Ukraine", "Iran",
  "Afghanistan", "South Korea", "North Korea", "Vietnam", "Thailand",
  "Philippines", "New Zealand", "Libya", "Sudan", "Somalia", "Mauritania",
  "Bahrain", "Oman", "Cyprus", "Malta", "Ireland", "Iceland",
  // More geography / landmarks / cities
  "Mount Kilimanjaro", "Niagara Falls", "Grand Canyon", "Victoria Falls",
  "Amazon rainforest", "Antarctica", "Arctic", "Mediterranean Sea",
  "Persian Gulf", "Atlantic Ocean", "Pacific Ocean", "Indian Ocean",
  "Himalayas", "Alps", "Andes", "Sinai Peninsula", "Jerusalem", "Mecca",
  "Medina", "Baghdad", "Damascus", "Beirut", "Cairo", "Istanbul",
  "Casablanca", "Dubai", "Abu Dhabi", "Riyadh", "Doha",
  // More history
  "Ancient Greece", "Alexander the Great", "Julius Caesar", "Napoleon",
  "Genghis Khan", "Saladin", "Spanish Civil War", "Vietnam War",
  "American Civil War", "American Revolution", "Russian Revolution",
  "Berlin Wall", "The Holocaust", "Nuclear weapon", "Space Race",
  "Middle Ages", "Mesopotamia", "Phoenicia", "Silk Road", "Colonialism",
  "United Nations", "NATO", "European Union", "Arab League",
  "Suleiman the Magnificent", "Yasser Arafat", "Gamal Abdel Nasser",
  "Anwar Sadat", "Hussein of Jordan",
  // More science
  "Stephen Hawking", "Nikola Tesla", "Thomas Edison", "Galileo Galilei",
  "Niels Bohr", "Human brain", "Human heart", "Immune system", "Vaccine",
  "Antibiotic", "Gravity", "Electricity", "Nuclear power", "Climate change",
  "Renewable energy", "Solar energy", "Genetics", "Virus", "Bacteria",
  "Cell (biology)", "Ecosystem", "Biodiversity", "Ocean", "Volcano",
  "Earthquake", "Tsunami", "Hurricane",
  // More technology
  "Mobile phone", "Social media", "Facebook", "YouTube", "Google",
  "Microsoft", "Apple Inc.", "Elon Musk", "Bill Gates", "Steve Jobs",
  "Mark Zuckerberg", "SpaceX", "Robot", "Cryptocurrency", "Bitcoin",
  "Blockchain", "Virtual reality", "Semiconductor", "JavaScript",
  // More arts / entertainment
  "Hollywood", "Netflix", "The Walt Disney Company", "Star Wars",
  "Harry Potter", "The Beatles", "Michael Jackson", "Elvis Presley",
  "Classical music", "Jazz", "Hip hop music", "Opera", "Ballet", "Painting",
  "Sculpture", "Architecture", "Photography", "Poetry", "Novel",
  // More sports
  "Tennis", "Boxing", "Swimming", "Cricket", "Rugby football",
  "Formula One", "Usain Bolt", "Michael Jordan", "Serena Williams",
  "Muhammad Ali", "Michael Phelps", "Golf", "Volleyball", "Table tennis",
  // More celebrities / notable figures
  "Omar Sharif", "Salma Hayek", "Rami Malek", "Shakira", "Khalil Gibran",
  "Ibn Khaldun", "Averroes", "Avicenna", "Al-Khwarizmi", "Rania of Jordan",
  // More religion / philosophy
  "Sunni Islam", "Shia Islam", "Sufism", "Hajj", "Ramadan", "Catholic Church",
  "Buddhism", "Hinduism", "Sikhism", "Socrates", "Plato", "Aristotle",
  "Confucius",
  // Everyday / food / culture
  "Coffee", "Tea", "Dates (fruit)", "Olive oil", "Shawarma", "Mansaf",
  "Baklava", "Arabic language", "Arabic calligraphy", "Henna",
  "Arabian horse", "Camel", "Desert", "Oasis",
  // Broad hub topics
  "Time", "Space", "Universe", "Light", "Sound", "Color", "Love", "War",
  "Peace", "Freedom", "Education", "University", "Health", "Medicine",
  "Law", "Government", "Politics", "Religion", "Culture", "Society",
  "Family", "Marriage", "Money", "Trade", "Agriculture", "Transport",
  "Automobile", "Airplane", "Ship", "Train", "Bicycle",
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

async function fetchJsonOnce(
  url: URL,
): Promise<{ ok: boolean; status: number; data?: WikiApiResponse; text?: string }> {
  // A transient DNS/network blip throws here rather than returning a bad
  // status — caught so it's retried like any other failure instead of
  // crashing the whole run (and losing every batch scored so far, since
  // the SQL file used to only get written once at the very end).
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const text = await res.text();
    try {
      return { ok: true, status: res.status, data: JSON.parse(text) };
    } catch {
      return { ok: false, status: res.status, text };
    }
  } catch (err) {
    return { ok: false, status: 0, text: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchJson(url: URL): Promise<WikiApiResponse | null> {
  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await fetchJsonOnce(url);
    if (result.ok) return result.data ?? null;
    console.warn(`  attempt ${attempt}/${MAX_ATTEMPTS} failed (status ${result.status}): ${result.text?.slice(0, 80)}`);
    if (attempt < MAX_ATTEMPTS) {
      console.warn(`  retrying after ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  console.warn("  giving up on this request after all retries");
  return null;
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

function writeResults(results: Metadata[]) {
  const rows = results.map((r) => {
    const linkDensity = r.linkCount / (r.wordCount / 100);
    const tier = classify(r.wordCount, linkDensity);
    return { ...r, linkDensity, tier };
  });

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

  writeFileSync("supabase/seed/0004_article_metadata_batch2.sql", sql + "\n");
  return rows;
}

async function main() {
  const results: Metadata[] = [];
  const batches = chunk(CANDIDATES, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    console.log(`batch ${i + 1}/${batches.length}: ${batches[i].join(", ")}`);
    try {
      const batchResults = await fetchBatch(batches[i]);
      results.push(...batchResults.values());
    } catch (err) {
      console.warn(`  batch failed entirely, skipping: ${err instanceof Error ? err.message : err}`);
    }
    console.log(`  scored ${results.length}/${CANDIDATES.length} so far`);
    // Overwrite the SQL file after every batch, not just at the end — a
    // crash mid-run (like the DNS blip that killed the first attempt)
    // then loses nothing already scored.
    writeResults(results);
    await sleep(DELAY_MS);
  }

  const rows = writeResults(results);
  const tierCounts = { easy: 0, medium: 0, hard: 0 };
  for (const row of rows) tierCounts[row.tier]++;
  console.log("\nTier distribution:", tierCounts);
  console.log(`Wrote supabase/seed/0004_article_metadata_batch2.sql (${rows.length} articles)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
