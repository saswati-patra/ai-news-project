export type SummarySource = "transcript" | "title_description";

export interface YouTubeSummary {
  title: string;
  video_id: string;
  url: string;
  published_at: string;
  summary: string;
  summary_source: SummarySource;
  transcript_available: boolean;
}

export interface SummaryQuery {
  channel: string;
  days: number;
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export class SummaryApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "SummaryApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isYouTubeSummary(value: unknown): value is YouTubeSummary {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === "string" &&
    typeof value.video_id === "string" &&
    typeof value.url === "string" &&
    typeof value.published_at === "string" &&
    typeof value.summary === "string" &&
    (value.summary_source === "transcript" || value.summary_source === "title_description") &&
    typeof value.transcript_available === "boolean"
  );
}

export async function fetchYouTubeSummaries(
  query: SummaryQuery,
  fetcher: Fetcher = fetch
): Promise<YouTubeSummary[]> {
  const searchParams = new URLSearchParams({
    channel: query.channel.trim(),
    days: String(query.days),
  });
  const response = await fetcher(`/youtube-summary?${searchParams.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.detail === "string"
        ? payload.detail
        : "Could not load summaries";
    throw new SummaryApiError(message, response.status);
  }

  if (!Array.isArray(payload) || !payload.every(isYouTubeSummary)) {
    throw new SummaryApiError("Unexpected response from the API", response.status);
  }

  return payload;
}
