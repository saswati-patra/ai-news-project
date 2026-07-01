import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { YouTubeSummary } from "@/lib/youtube-summary-api";
import { SummariesPage } from "@/pages/summaries-page";

const summaries: YouTubeSummary[] = [
  {
    title: "Inside dark matter",
    video_id: "video-1",
    url: "https://www.youtube.com/watch?v=video-1",
    published_at: "2026-06-29T12:00:00+00:00",
    summary: "A clear explanation of the search for dark matter.",
    summary_source: "transcript",
    transcript_available: true,
  },
  {
    title: "Before the Big Bang",
    video_id: "video-2",
    url: "https://www.youtube.com/watch?v=video-2",
    published_at: "2026-06-28T12:00:00+00:00",
    summary: "A metadata-based overview.",
    summary_source: "title_description",
    transcript_available: false,
  },
];

describe("SummariesPage", () => {
  it("loads Science Channel for five days by default", async () => {
    const loader = vi.fn(async () => summaries);

    render(<SummariesPage loadSummaries={loader} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading summaries");
    await waitFor(() =>
      expect(loader).toHaveBeenCalledWith({ channel: "sciencechannel", days: 5 })
    );
    expect(await screen.findByText("Inside dark matter")).toBeInTheDocument();
  });

  it("derives metrics and renders summary quality", async () => {
    const loader = vi.fn(async () => summaries);

    render(<SummariesPage loadSummaries={loader} />);

    expect(await screen.findByText("2 videos")).toBeInTheDocument();
    expect(screen.getByText("1 transcript")).toBeInTheDocument();
    expect(screen.getByText("5 day window")).toBeInTheDocument();
    expect(screen.getByText("Limited metadata")).toBeInTheDocument();
  });

  it("clears a stale error and loads again when the loader changes", async () => {
    const failingLoader = vi.fn(async () => {
      throw new Error("First request failed");
    });
    const replacementLoader = vi.fn(async () => summaries);
    const { rerender } = render(<SummariesPage loadSummaries={failingLoader} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("First request failed");

    rerender(<SummariesPage loadSummaries={replacementLoader} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading summaries");
    expect(await screen.findByText("Inside dark matter")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error when the loader throws synchronously", async () => {
    const loader = vi.fn(() => {
      throw new Error("Synchronous failure");
    });

    render(<SummariesPage loadSummaries={loader} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Synchronous failure");
  });

  it("omits time metadata when the published date is invalid", async () => {
    const loader = vi.fn(async () => [
      {
        ...summaries[0],
        video_id: "invalid-date-video",
        published_at: "not-a-date",
      },
    ]);
    const { container } = render(<SummariesPage loadSummaries={loader} />);

    expect(await screen.findByText("Published date unavailable")).toBeInTheDocument();
    expect(container.querySelector("time")).not.toBeInTheDocument();
    expect(container.querySelector("[datetime]")).not.toBeInTheDocument();
  });
});
