import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import { SummaryCard } from "@/components/summary-card";
import { SummaryMetrics } from "@/components/summary-metrics";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchYouTubeSummaries,
  type SummaryQuery,
  type YouTubeSummary,
} from "@/lib/youtube-summary-api";

type SummaryLoader = (query: SummaryQuery) => Promise<YouTubeSummary[]>;

interface SummariesPageProps {
  loadSummaries?: SummaryLoader;
}

interface PageError {
  message: string;
  retryable: boolean;
}

const DEFAULT_QUERY: SummaryQuery = { channel: "sciencechannel", days: 5 };

const SOURCES = [
  { label: "Science Channel", channel: "sciencechannel" },
  { label: "FactTechz", channel: "facttechz" },
] as const;

function errorMessage(caughtError: unknown) {
  return caughtError instanceof Error && caughtError.message
    ? caughtError.message
    : "Could not load summaries";
}

export function SummariesPage({ loadSummaries = fetchYouTubeSummaries }: SummariesPageProps) {
  const [channel, setChannel] = useState(DEFAULT_QUERY.channel);
  const [daysInput, setDaysInput] = useState(String(DEFAULT_QUERY.days));
  const [successfulQuery, setSuccessfulQuery] = useState<SummaryQuery>(DEFAULT_QUERY);
  const [summaries, setSummaries] = useState<YouTubeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PageError | null>(null);
  const [lastRequestedQuery, setLastRequestedQuery] = useState<SummaryQuery>(DEFAULT_QUERY);
  const requestIdRef = useRef(0);

  const runQuery = useCallback(
    async (query: SummaryQuery) => {
      const requestId = ++requestIdRef.current;
      setLastRequestedQuery(query);
      setLoading(true);
      setError(null);

      try {
        const loadedSummaries = await loadSummaries(query);

        if (requestId === requestIdRef.current) {
          setSummaries(loadedSummaries);
          setSuccessfulQuery(query);
        }
      } catch (caughtError: unknown) {
        if (requestId === requestIdRef.current) {
          setError({ message: errorMessage(caughtError), retryable: true });
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [loadSummaries]
  );

  useEffect(() => {
    void runQuery(DEFAULT_QUERY);

    return () => {
      requestIdRef.current += 1;
    };
  }, [runQuery]);

  const numericDays = Number(daysInput);
  const parsedDays =
    Number.isInteger(numericDays) && numericDays >= 1 && numericDays <= 30 ? numericDays : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedChannel = channel.trim();

    if (!trimmedChannel) {
      setError({ message: "Channel is required", retryable: false });
      return;
    }

    if (parsedDays === null) {
      setError({ message: "Days must be between 1 and 30", retryable: false });
      return;
    }

    void runQuery({ channel: trimmedChannel, days: parsedDays });
  }

  function selectSource(selectedChannel: string) {
    const days = parsedDays ?? successfulQuery.days;
    setChannel(selectedChannel);
    setDaysInput(String(days));
    void runQuery({ channel: selectedChannel, days });
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase">
            AI Newsroom
          </p>
          <h1 className="text-foreground mt-1 text-3xl font-semibold tracking-tight">
            YouTube science briefing
          </h1>
        </div>
        <Button variant="outline" disabled={loading} onClick={() => void runQuery(successfulQuery)}>
          <RefreshCw aria-hidden="true" className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside
          aria-label="Summary sources"
          className="border-border bg-card h-fit rounded-2xl border p-4 shadow-sm"
        >
          <p className="text-muted-foreground px-2 text-xs font-semibold tracking-wide uppercase">
            Sources
          </p>
          <nav className="mt-2 grid grid-cols-2 gap-1 lg:grid-cols-1">
            {SOURCES.map((source) => {
              const selected = channel === source.channel;

              return (
                <Button
                  key={source.channel}
                  variant={selected ? "default" : "ghost"}
                  className="justify-start"
                  disabled={loading}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => selectSource(source.channel)}
                >
                  {source.label}
                </Button>
              );
            })}
          </nav>
        </aside>

        <section aria-labelledby="briefing-title" className="min-w-0 space-y-5">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Dashboard
            </p>
            <h2 id="briefing-title" className="text-foreground mt-1 text-2xl font-semibold">
              Your briefing
            </h2>
          </div>

          <form
            noValidate
            className="border-border bg-card grid gap-4 rounded-2xl border p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end"
            onSubmit={submit}
          >
            <div className="grid gap-1.5">
              <label className="text-foreground text-sm font-medium" htmlFor="summary-channel">
                Channel
              </label>
              <Input
                id="summary-channel"
                disabled={loading}
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-foreground text-sm font-medium" htmlFor="summary-days">
                Days
              </label>
              <Input
                id="summary-days"
                type="number"
                min={1}
                max={30}
                disabled={loading}
                value={daysInput}
                onChange={(event) => setDaysInput(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              Load summaries
            </Button>
          </form>

          {loading && (
            <p role="status" className="text-muted-foreground text-sm">
              Loading summaries
            </p>
          )}

          {error && (
            <Alert className="flex flex-wrap items-center justify-between gap-3">
              <span>{error.message}</span>
              {error.retryable && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={() => void runQuery(lastRequestedQuery)}
                >
                  Retry
                </Button>
              )}
            </Alert>
          )}

          {summaries.length > 0 && (
            <div className="space-y-4">
              <SummaryMetrics summaries={summaries} days={successfulQuery.days} />
              <div className="grid gap-4">
                {summaries.map((summary) => (
                  <SummaryCard key={summary.video_id} summary={summary} />
                ))}
              </div>
            </div>
          )}

          {!loading && !error && summaries.length === 0 && (
            <div className="border-border bg-card rounded-2xl border border-dashed p-8 text-center">
              <h3 className="text-foreground text-lg font-semibold">No recent videos found</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Try another source or expand the day window.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
