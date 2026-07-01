import type { YouTubeSummary } from "@/lib/youtube-summary-api";

interface SummaryMetricsProps {
  summaries: YouTubeSummary[];
  days: number;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function SummaryMetrics({ summaries, days }: SummaryMetricsProps) {
  const transcriptCount = summaries.filter((summary) => summary.transcript_available).length;
  const metrics = [
    {
      value: pluralize(summaries.length, "video"),
      label: "In this briefing",
    },
    {
      value: pluralize(transcriptCount, "transcript"),
      label: "Full-source coverage",
    },
    {
      value: `${days} day window`,
      label: "Selected range",
    },
  ];

  return (
    <section aria-label="Summary metrics" className="grid gap-3 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="border-border bg-card rounded-xl border p-4">
          <p className="text-foreground text-lg font-semibold">{metric.value}</p>
          <p className="text-muted-foreground mt-1 text-xs">{metric.label}</p>
        </div>
      ))}
    </section>
  );
}
