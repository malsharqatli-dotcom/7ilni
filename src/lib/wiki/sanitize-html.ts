import * as cheerio from "cheerio";

// Wikipedia "furniture" — content that isn't part of the article's prose.
// Links inside these are disabled so races can't be skipped via an infobox
// or navbox shortcut. Content stays visible; only the links are defanged.
const FURNITURE_SELECTORS = [
  ".infobox",
  ".navbox",
  ".sidebar",
  ".hatnote",
  ".reflist",
  ".references",
  "sup.reference",
  ".mw-editsection",
  "table.metadata",
  ".ambox",
  ".noprint",
  "style",
  "script",
].join(", ");

// Namespace prefixes that never point at a race-able article.
const NON_ARTICLE_NAMESPACES = new Set([
  "File",
  "Category",
  "Help",
  "Wikipedia",
  "Template",
  "Special",
  "Talk",
  "Portal",
  "Draft",
  "Module",
  "User",
  "MediaWiki",
  "TimedText",
  "Template talk",
  "User talk",
  "Category talk",
  "Help talk",
  "Wikipedia talk",
  "Portal talk",
  "Module talk",
  "Draft talk",
]);

function resolveTitleFromHref(href: string | undefined): string | null {
  if (!href || href.startsWith("#") || href.startsWith("http")) return null;
  // Links to a specific section of another article ("./Page#Section") carry
  // a fragment that isn't part of the article's actual title — drop it, or
  // the resolved "title" won't match any real Wikipedia page.
  const cleaned = href.replace(/^\.\//, "").replace(/#.*$/, "");
  if (!cleaned) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(cleaned);
  } catch {
    return null;
  }

  const title = decoded.replace(/_/g, " ");
  const colonIndex = title.indexOf(":");
  if (colonIndex > 0 && NON_ARTICLE_NAMESPACES.has(title.slice(0, colonIndex))) {
    return null;
  }

  return title;
}

export type SanitizedArticle = {
  title: string;
  html: string;
};

export function sanitizeArticleHtml(rawHtml: string, requestedTitle: string): SanitizedArticle {
  const $ = cheerio.load(rawHtml);

  $("a").each((_, el) => {
    const $el = $(el);
    const isFurniture = $el.closest(FURNITURE_SELECTORS).length > 0;
    const isRedLink = $el.hasClass("new");
    const resolvedTitle = resolveTitleFromHref($el.attr("href"));

    if (isFurniture || isRedLink || !resolvedTitle) {
      $el.removeAttr("href");
      $el.addClass("wiki-link-disabled");
      return;
    }

    $el.attr("data-wiki-title", resolvedTitle);
  });

  const docTitle = $("head title").first().text();
  const title = (docTitle || requestedTitle).replace(/\s*-\s*Wikipedia$/, "").trim();

  return {
    title,
    html: $("body").html() ?? "",
  };
}
