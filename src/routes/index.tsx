import { createFileRoute } from "@tanstack/react-router";
import { AnnotationsPanel } from "@/components/annotations-panel";
import { ControlBar } from "@/components/control-bar";
import { CrisisCards } from "@/components/crisis-cards";
import { PageHeader } from "@/components/page-header";
import { RiskChart } from "@/components/risk-chart";
import { StatCards } from "@/components/stat-cards";
import { useTracker } from "@/lib/tracker-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — VolTrack Market Risk Tracker" },
      { name: "description", content: "Index price vs annualised rolling volatility with crisis overlays and notes." },
      { property: "og:title", content: "Dashboard — VolTrack Market Risk Tracker" },
      { property: "og:description", content: "Index price vs annualised rolling volatility with crisis overlays and notes." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { index, window } = useTracker();
  return (
    <>
      <PageHeader title={`${index} · Risk Dashboard`} subtitle="Closing price vs annualised rolling volatility. Click a crisis to zoom in." />
      <ControlBar />
      <StatCards />
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Legend cls="bg-price" label="Close (left axis)" />
          <Legend cls="bg-vol" label={`${window}D annualised vol (right axis)`} />
          <Legend cls="bg-loss/40" label="Crisis window" />
          <Legend cls="bg-gain" label="Your note" />
        </div>
        <RiskChart />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          <h2 className="font-medium">Historic market shocks</h2>
          <CrisisCards />
        </section>
        <AnnotationsPanel />
      </div>
    </>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-3 rounded-sm ${cls}`} />
      {label}
    </span>
  );
}
