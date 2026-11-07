"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

type ArticleViewProps = {
  html: string;
  // Race view intercepts hops to record/broadcast them instead of just
  // navigating; plain /article/[title] pages fall back to router.push.
  onLinkClick?: (title: string) => void;
};

export default function ArticleView({ html, onLinkClick }: ArticleViewProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest("a");
    if (!link || !containerRef.current?.contains(link)) return;

    event.preventDefault();

    const title = link.getAttribute("data-wiki-title");
    if (!title) return;

    if (onLinkClick) {
      onLinkClick(title);
    } else {
      router.push(`/article/${encodeURIComponent(title)}`);
    }
  }

  return (
    <div
      ref={containerRef}
      dir="ltr"
      lang="en"
      onClick={handleClick}
      className="wiki-article prose max-w-none rounded-2xl bg-white p-6 text-start shadow-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
