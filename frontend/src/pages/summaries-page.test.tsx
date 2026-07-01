import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByRole("status")).toHaveClass(
      "lg:sticky",
      "lg:top-0",
      "lg:z-10",
      "lg:bg-background"
    );
    await waitFor(() =>
      expect(loader).toHaveBeenCalledWith({ channel: "sciencechannel", days: 5 })
    );
    expect(await screen.findByText("Inside dark matter")).toBeInTheDocument();
  });

  it("keeps desktop filters fixed outside independently scrolling results", async () => {
    const loader = vi.fn(async () => summaries);

    render(<SummariesPage loadSummaries={loader} />);

    await screen.findByText("Inside dark matter");

    const main = screen.getByRole("main");
    const sources = screen.getByRole("complementary", { name: "Summary sources" });
    const results = screen.getByRole("region", { name: "Summary results" });
    const contentGrid = sources.parentElement;
    const dashboard = results.parentElement;
    const filterForm = screen.getByRole("button", { name: "Load summaries" }).closest("form");

    expect(main).toHaveClass("lg:h-dvh", "lg:overflow-hidden");
    expect(main).not.toHaveClass("overflow-hidden");
    expect(contentGrid).toHaveClass("lg:min-h-0", "lg:flex-1");
    expect(sources).toHaveClass("lg:h-full", "lg:overflow-y-auto");
    expect(sources).not.toHaveClass("overflow-y-auto");
    expect(dashboard).toHaveClass("lg:flex", "lg:min-h-0", "lg:flex-col");
    expect(results).toHaveClass("lg:min-h-0", "lg:flex-1", "lg:overflow-y-auto");
    expect(results).not.toHaveClass("overflow-y-auto");
    expect(filterForm).not.toBeNull();
    expect(results).not.toContainElement(filterForm);
    expect(within(results).getByText("Inside dark matter")).toBeInTheDocument();
  });

  it("disables all interactive controls while summaries are loading", () => {
    const loader = vi.fn(() => new Promise<YouTubeSummary[]>(() => {}));

    render(<SummariesPage loadSummaries={loader} />);

    expect.soft(screen.getByLabelText("Channel")).toBeDisabled();
    expect.soft(screen.getByLabelText("Days")).toBeDisabled();
    expect.soft(screen.getByRole("button", { name: "Load summaries" })).toBeDisabled();
    expect.soft(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    expect.soft(screen.getByRole("button", { name: "Science Channel" })).toBeDisabled();
    expect.soft(screen.getByRole("button", { name: "FactTechz" })).toBeDisabled();
  });

  it("loads FactTechz when its source shortcut is selected", async () => {
    const user = userEvent.setup();
    const loader = vi.fn(async () => summaries);

    render(<SummariesPage loadSummaries={loader} />);

    await screen.findByText("Inside dark matter");
    await user.click(screen.getByRole("button", { name: "FactTechz" }));
    await waitFor(() => expect(loader).toHaveBeenLastCalledWith({ channel: "facttechz", days: 5 }));
  });

  it("submits a supported channel and day window", async () => {
    const user = userEvent.setup();
    const loader = vi.fn(async () => summaries);

    render(<SummariesPage loadSummaries={loader} />);

    await screen.findByText("Inside dark matter");
    await user.clear(screen.getByLabelText("Channel"));
    await user.type(screen.getByLabelText("Channel"), "Science Channel");
    await user.clear(screen.getByLabelText("Days"));
    await user.type(screen.getByLabelText("Days"), "14");
    await user.click(screen.getByRole("button", { name: "Load summaries" }));

    await waitFor(() =>
      expect(loader).toHaveBeenLastCalledWith({ channel: "Science Channel", days: 14 })
    );
    expect(screen.getByText("14 day window")).toBeInTheDocument();
  });

  it("rejects a day window outside one through thirty", async () => {
    const user = userEvent.setup();
    const loader = vi.fn(async () => summaries);

    render(<SummariesPage loadSummaries={loader} />);

    await screen.findByText("Inside dark matter");
    await user.clear(screen.getByLabelText("Days"));
    await user.type(screen.getByLabelText("Days"), "31");
    await user.click(screen.getByRole("button", { name: "Load summaries" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Days must be between 1 and 30");
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state when no recent videos are found", async () => {
    const loader = vi.fn(async () => []);

    render(<SummariesPage loadSummaries={loader} />);

    expect(await screen.findByText("No recent videos found")).toBeInTheDocument();
  });

  it("preserves summaries when a refresh fails and retries the request", async () => {
    const user = userEvent.setup();
    let attempt = 0;
    const loader = vi.fn(async () => {
      attempt += 1;

      if (attempt === 2) {
        throw new Error("OpenAI quota exceeded");
      }

      return summaries;
    });

    render(<SummariesPage loadSummaries={loader} />);

    await screen.findByText("Inside dark matter");
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("OpenAI quota exceeded");
    expect(alert).toHaveClass("lg:sticky", "lg:top-0", "lg:z-10", "bg-red-50");
    expect(screen.getByText("Inside dark matter")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(3));
    expect(loader).toHaveBeenNthCalledWith(3, { channel: "sciencechannel", days: 5 });
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
