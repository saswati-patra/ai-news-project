import { describe, expect, it, vi } from "vitest";

import { fetchYouTubeSummaries, SummaryApiError, type Fetcher } from "@/lib/youtube-summary-api";

const summary = {
  title: "Inside dark matter",
  video_id: "video-1",
  url: "https://www.youtube.com/watch?v=video-1",
  published_at: "2026-06-29T12:00:00+00:00",
  summary: "A clear explanation.",
  summary_source: "transcript" as const,
  transcript_available: true,
};

describe("fetchYouTubeSummaries", () => {
  it("encodes the query, requests JSON, and returns validated summaries", async () => {
    const fetcher = vi.fn<Fetcher>(async () => Response.json([summary], { status: 200 }));

    await expect(
      fetchYouTubeSummaries({ channel: "Science Channel", days: 5 }, fetcher)
    ).resolves.toEqual([summary]);
    expect(fetcher).toHaveBeenCalledWith("/youtube-summary?channel=Science+Channel&days=5", {
      headers: { Accept: "application/json" },
    });
  });

  it("uses the API detail for JSON error responses", async () => {
    const fetcher = vi.fn<Fetcher>(async () =>
      Response.json({ detail: "Unsupported channel" }, { status: 400 })
    );

    const request = fetchYouTubeSummaries({ channel: "Science Channel", days: 5 }, fetcher);

    await expect(request).rejects.toMatchObject({
      name: "SummaryApiError",
      message: "Unsupported channel",
      status: 400,
    });
    await expect(request).rejects.toBeInstanceOf(SummaryApiError);
  });

  it("uses a stable error for non-JSON error responses", async () => {
    const fetcher = vi.fn<Fetcher>(async () => new Response("Bad gateway", { status: 502 }));

    const request = fetchYouTubeSummaries({ channel: "Science Channel", days: 5 }, fetcher);

    await expect(request).rejects.toMatchObject({
      name: "SummaryApiError",
      message: "Could not load summaries",
      status: 502,
    });
    await expect(request).rejects.toBeInstanceOf(SummaryApiError);
  });

  it("rejects successful malformed responses", async () => {
    const fetcher = vi.fn<Fetcher>(async () =>
      Response.json([{ title: "Incomplete" }], { status: 200 })
    );

    const request = fetchYouTubeSummaries({ channel: "Science Channel", days: 5 }, fetcher);

    await expect(request).rejects.toMatchObject({
      name: "SummaryApiError",
      message: "Unexpected response from the API",
      status: 200,
    });
    await expect(request).rejects.toBeInstanceOf(SummaryApiError);
  });
});
