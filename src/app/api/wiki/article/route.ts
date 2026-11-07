import { NextRequest, NextResponse } from "next/server";
import { ArticleNotFoundError, RateLimitedError, getArticle } from "@/lib/wiki/fetch-article";

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title");
  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  try {
    const article = await getArticle(title);
    return NextResponse.json(article);
  } catch (error) {
    if (error instanceof ArticleNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof RateLimitedError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 502 });
  }
}
