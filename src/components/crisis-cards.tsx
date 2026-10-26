import { ZoomIn } from "lucide-react";
import { CRISES, type CrisisEvent } from "@/lib/market-data";
import { useTracker } from "@/lib/tracker-store";
import { cn } from "@/lib/utils";

function pad(date: string, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function useZoomToCrisis() {
  const { setZoom } = useTracker();
  return (c: CrisisEvent) => setZoom({ start: pad(c.start_date, -90), end: pad(c.end_date, 90), label: c.name });
}

export function CrisisCards() {
  const { zoom } = useTracker();
  const zoomTo = useZoomToCrisis();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {CRISES.map((c) => {
        const active = zoom?.label === c.name;
        return (
          <button
            key={c.id}
            onClick={() => {
              zoomTo(c);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={cn(
              "group rounded-lg border bg-card p-4 text-left transition-colors hover:border-loss/60 hover:bg-accent",
              active && "border-loss bg-accent",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{c.name}</div>
              <ZoomIn className="size-4 shrink-0 text-muted-foreground group-hover:text-loss" />
            </div>
            <div className="num mt-1 text-[11px] text-muted-foreground">
              {c.start_date} → {c.end_date}
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="num text-lg font-semibold text-loss">{c.peak_volatility.toFixed(1)}%</span>
              <span className="text-[11px] text-muted-foreground">peak ann. vol</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
