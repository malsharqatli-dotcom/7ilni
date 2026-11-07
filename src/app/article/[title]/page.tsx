import { notFound } from "next/navigation";
import ArticleView from "@/components/ArticleView";
import { ArticleNotFoundError, RateLimitedError, getArticle } from "@/lib/wiki/fetch-article";

export default async function ArticlePage(props: PageProps<"/article/[title]">) {
  const { title } = await props.params;
  const decodedTitle = decodeURIComponent(title);

  let article;
  try {
    article = await getArticle(decodedTitle);
  } catch (error) {
    if (error instanceof ArticleNotFoundError) notFound();
    if (error instanceof RateLimitedError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4 text-center">
          <p className="font-body text-brand-navy">{error.message}</p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-brand-cream px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 font-display text-3xl text-brand-navy">{article.title}</h1>
        <ArticleView html={article.html} />
      </div>
    </div>
  );
}
