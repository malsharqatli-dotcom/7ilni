import { sanitizeArticleHtml, type SanitizedArticle } from "./sanitize-html";

// Wikimedia's API Usage Guidelines require a descriptive User-Agent with
// contact info, or requests get capped much harder (10 req/min vs 200).
// TODO: replace the contact URL/email with 7ilni's real ones before deploying.
const WIKI_USER_AGENT =
  "7ilni/0.1 (https://example.com/7ilni; contact@example.com) Node.js";

export class ArticleNotFoundError extends Error {}
export class RateLimitedError extends Error {}

// Process-local memoization so repeat visits to the same article (going
// back, multiple players starting on the same article) don't re-hit
// Wikipedia. Not a substitute for M3's persistent DB cache — this only
// lives as long as the dev/server process does — but it's a cheap, real
// reduction in request volume today.
const cache = new Map<string, SanitizedArticle>();

export async function getArticle(title: string): Promise<SanitizedArticle> {
  const cached = cache.get(title.toLowerCase());
  if (cached) return cached;

  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`,
    { headers: { "User-Agent": WIKI_USER_AGENT } },
  );

  if (response.status === 404) {
    throw new ArticleNotFoundError(`No Wikipedia article for "${title}"`);
  }
  if (response.status === 429) {
    // Expected without caching (added in M3) — every fetch hits Wikipedia directly.
    throw new RateLimitedError("Wikipedia rate-limited this request. Try again shortly.");
  }
  if (!response.ok) {
    throw new Error(`Wikipedia returned ${response.status} for "${title}"`);
  }

  const rawHtml = await response.text();
  const article = sanitizeArticleHtml(rawHtml, title);
  cache.set(title.toLowerCase(), article);
  cache.set(article.title.toLowerCase(), article);
  return article;
}
