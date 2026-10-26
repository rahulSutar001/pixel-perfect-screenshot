import { useTracker } from "@/lib/tracker-store";
import { cn } from "@/lib/utils";

export function StatCards() {
  const { visible, window } = useTracker();
  const last = visible[visible.length - 1];
  const firstClose = visible[0]?.close ?? 0;
  const vols = visible.map((p) => p.vol).filter((v): v is number => v != null);
  const peak = vols.length ? Math.max(...vols) : 0;
  const avg = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;
  const change = firstClose ? ((last.close - firstClose) / firstClose) * 100 : 0;
  const regime = (last?.vol ?? 0) > avg * 1.4 ? "Stressed" : (last?.vol ?? 0) < avg * 0.8 ? "Calm" : "Normal";

  const items = [
    { label: "Last close", value: last?.close.toLocaleString("en-IN", { maximumFractionDigits: 2 }), cls: "text-price" },
    { label: "Period return", value: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`, cls: change >= 0 ? "text-gain" : "text-loss" },
    { label: `Current ${window}D vol`, value: `${(last?.vol ?? 0).toFixed(2)}%`, cls: "text-vol" },
    { label: "Peak vol in range", value: `${peak.toFixed(1)}%`, cls: "text-loss" },
    { label: "Regime", value: regime, cls: regime === "Stressed" ? "text-loss" : regime === "Calm" ? "text-gain" : "text-foreground" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg border bg-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{i.label}</div>
          <div className={cn("num mt-1 text-xl font-semibold", i.cls)}>{i.value}</div>
        </div>
      ))}
    </div>
  );
}
