import { useEffect, useState } from "react";

import { SummaryCard } from "@/components/summary-card";
import { SummaryMetrics } from "@/components/summary-metrics";
import {
  fetchYouTubeSummaries,
  type SummaryQuery,
  type YouTubeSummary,
} from "@/lib/youtube-summary-api";

type SummaryLoader = (query: SummaryQuery) => Promise<YouTubeSummary[]>;

interface SummariesPageProps {
  loadSummaries?: SummaryLoader;
}

const DEFAULT_QUERY: SummaryQuery = { channel: "sciencechannel", days: 5 };

export function SummariesPage({ loadSummaries = fetchYouTubeSummaries }: SummariesPageProps) {
  const [summaries, setSummaries] = useState<YouTubeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const loadedSummaries = await loadSummaries(DEFAULT_QUERY);

        if (active) {
          setSummaries(loadedSummaries);
        }
      } catch (caughtError: unknown) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not load summaries");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadSummaries]);

  return (
    <main>
      <h1>AI Newsroom</h1>
      {loading && <p role="status">Loading summaries</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <>
          <SummaryMetrics summaries={summaries} days={DEFAULT_QUERY.days} />
          {summaries.map((summary) => (
            <SummaryCard key={summary.video_id} summary={summary} />
          ))}
        </>
      )}
    </main>
  );
}
