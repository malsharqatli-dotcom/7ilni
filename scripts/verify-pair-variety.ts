// Re-verification (same concern the user raised originally: a thin
// deck+difficulty combo repeating the same pair over and over) now that
// the pool has grown from 136 to 383 articles and gained 2 new decks.
// Mirrors /api/race/start's actual candidate-pool logic: deck+difficulty
// combined, falling back to the whole deck if that's too thin, or the
// pure difficulty-tier pool (capped at 50, matching the route) otherwise.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://odccxcylsjyvpajtdmlc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4vQXqvVwgKJfRw816KhrCA_VU2i5Rcs";
const MIN_POOL_FOR_VARIETY = 5;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function pairCount(n: number): number {
  return (n * (n - 1)) / 2;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: articles, error: articlesError } = await supabase
    .from("article_metadata")
    .select("title, difficulty_tier");
  if (articlesError || !articles) throw new Error(articlesError?.message);

  const { data: decks, error: decksError } = await supabase.from("category_decks").select("id, slug, name_ar");
  if (decksError || !decks) throw new Error(decksError?.message);

  const { data: deckArticles, error: deckArticlesError } = await supabase
    .from("deck_articles")
    .select("deck_id, article_title");
  if (deckArticlesError || !deckArticles) throw new Error(deckArticlesError?.message);

  const tierByTitle = new Map(articles.map((a) => [a.title, a.difficulty_tier]));
  const titlesByTier = new Map<string, string[]>();
  for (const a of articles) {
    const list = titlesByTier.get(a.difficulty_tier) ?? [];
    list.push(a.title);
    titlesByTier.set(a.difficulty_tier, list);
  }

  const titlesByDeck = new Map<string, string[]>();
  for (const da of deckArticles) {
    const list = titlesByDeck.get(da.deck_id) ?? [];
    list.push(da.article_title);
    titlesByDeck.set(da.deck_id, list);
  }

  console.log("=== No deck (pure difficulty tier, capped at 50 like the route) ===");
  let worst = Infinity;
  let worstLabel = "";
  for (const tier of DIFFICULTIES) {
    const pool = (titlesByTier.get(tier) ?? []).slice(0, 50);
    const pairs = pairCount(pool.length);
    console.log(`  ${tier}: ${pool.length} articles -> ${pairs} possible pairs`);
    if (pairs < worst) {
      worst = pairs;
      worstLabel = `(no deck) ${tier}`;
    }
  }

  console.log("\n=== Per deck x difficulty ===");
  for (const deck of decks) {
    const deckTitles = titlesByDeck.get(deck.id) ?? [];
    for (const tier of DIFFICULTIES) {
      const tierMatches = deckTitles.filter((t) => tierByTitle.get(t) === tier);
      const pool = tierMatches.length >= MIN_POOL_FOR_VARIETY ? tierMatches : deckTitles;
      const usedFallback = tierMatches.length < MIN_POOL_FOR_VARIETY;
      const pairs = pairCount(pool.length);
      console.log(
        `  ${deck.slug} (${deck.name_ar}) + ${tier}: ${pool.length} articles${usedFallback ? " [fell back to whole deck]" : ""} -> ${pairs} possible pairs`,
      );
      if (pairs < worst) {
        worst = pairs;
        worstLabel = `${deck.slug} + ${tier}`;
      }
    }
  }

  console.log(`\nThinnest combo: ${worstLabel} with ${worst} possible pairs.`);
  console.log(worst < 10 ? "WARNING: below 10 possible pairs." : "All combos comfortably above the repetition-risk threshold.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
