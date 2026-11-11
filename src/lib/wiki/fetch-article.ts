import { supabase } from "@/lib/supabase/client";
import { sanitizeArticleHtml, type SanitizedArticle } from "./sanitize-html";

// Wikimedia's API Usage Guidelines require a descriptive User-Agent with
// real contact info, or requests get capped much harder (10 req/min vs 200).
const WIKI_USER_AGENT = "7ilni/1.0 (7ilni.app@gmail.com) Node.js";

// Wikipedia's 429s come with a short Retry-After (observed: ~11s), not a
// long-term ban — worth one automatic retry rather than failing the
// player's request outright. Capped so a request never hangs too long.
const MAX_RETRY_WAIT_MS = 15000;

export class ArticleNotFoundError extends Error {}
export class RateLimitedError extends Error {}

// Two cache layers: in-memory for same-process repeat hits (instant, no
// DB round-trip), backed by the persistent cached_articles table so the
// cache survives restarts and is shared across server instances. With
// many players racing through the same curated/difficulty-scored article
// pool, most traffic should hit one of these — a cache hit costs zero
// Wikipedia requests, which is what actually keeps us under Wikipedia's
// rate limit as player count grows, not the limit itself.
const memoryCache = new Map<string, SanitizedArticle>();

async function getCachedArticle(title: string): Promise<SanitizedArticle | null> {
  const key = title.toLowerCase();
  const memHit = memoryCache.get(key);
  if (memHit) return memHit;

  const { data } = await supabase
    .from("cached_articles")
    .select("title, sanitized_html")
    .ilike("title", title)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const article: SanitizedArticle = { title: data.title, html: data.sanitized_html };
  memoryCache.set(key, article);
  return article;
}

async function storeCachedArticle(requestedTitle: string, article: SanitizedArticle, revisionId: number) {
  memoryCache.set(requestedTitle.toLowerCase(), article);
  memoryCache.set(article.title.toLowerCase(), article);

  await supabase.from("cached_articles").upsert(
    {
      title: article.title,
      revision_id: revisionId,
      sanitized_html: article.html,
    },
    { onConflict: "title,revision_id" },
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromWikipedia(title: string): Promise<Response> {
  return fetch(`https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`, {
    headers: { "User-Agent": WIKI_USER_AGENT },
  });
}

export async function getArticle(title: string): Promise<SanitizedArticle> {
  const cached = await getCachedArticle(title);
  if (cached) return cached;

  let response = await fetchFromWikipedia(title);

  if (response.status === 429) {
    const retryAfterSeconds = Number(response.headers.get("retry-after")) || 5;
    await sleep(Math.min(retryAfterSeconds * 1000, MAX_RETRY_WAIT_MS));
    response = await fetchFromWikipedia(title);
  }

  if (response.status === 404) {
    throw new ArticleNotFoundError(`No Wikipedia article for "${title}"`);
  }
  if (response.status === 429) {
    throw new RateLimitedError("Wikipedia rate-limited this request. Try again shortly.");
  }
  if (!response.ok) {
    throw new Error(`Wikipedia returned ${response.status} for "${title}"`);
  }

  const revisionId = Number(response.headers.get("content-revision-id")) || 0;
  const rawHtml = await response.text();
  const article = sanitizeArticleHtml(rawHtml, title);

  await storeCachedArticle(title, article, revisionId);
  return article;
}
