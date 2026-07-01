import { ExternalLink } from "lucide-react";

import type { YouTubeSummary } from "@/lib/youtube-summary-api";

interface SummaryCardProps {
  summary: YouTubeSummary;
}

function formatPublishedAt(publishedAt: string) {
  const date = new Date(publishedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const quality = summary.transcript_available ? "Transcript summary" : "Limited metadata";
  const publishedAt = formatPublishedAt(summary.published_at);

  return (
    <article className="border-border bg-card rounded-2xl border p-5 shadow-sm">
      <p className="text-primary text-xs font-semibold tracking-wide uppercase">{quality}</p>
      <h2 className="text-foreground mt-2 text-xl font-semibold break-words">{summary.title}</h2>
      <p className="text-muted-foreground mt-3 leading-7 break-words">{summary.summary}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        {publishedAt ? (
          <time className="text-muted-foreground" dateTime={summary.published_at}>
            {publishedAt}
          </time>
        ) : (
          <span className="text-muted-foreground">Published date unavailable</span>
        )}
        <a
          className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
          href={summary.url}
          target="_blank"
          rel="noreferrer"
        >
          Watch on YouTube
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      </div>
    </article>
  );
}
