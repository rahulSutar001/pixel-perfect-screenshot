import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ControlBar } from "@/components/control-bar";
import { PageHeader } from "@/components/page-header";
import { ewmaForecaster, type ForecastPoint } from "@/lib/forecast";
import { downsample } from "@/lib/market-data";
import { useTracker } from "@/lib/tracker-store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Historical Analytics — VolTrack" },
      { name: "description", content: "Return distribution, drawdowns and volatility forecast for major indices." },
      { property: "og:title", content: "Historical Analytics — VolTrack" },
      { property: "og:description", content: "Return distribution, drawdowns and volatility forecast for major indices." },
    ],
  }),
  component: Analytics,
});

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 } };

function Analytics() {
  const { visible, series } = useTracker();
  const rets = visible.map((p) => p.ret).filter((r): r is number => r != null);

  const stats = useMemo(() => {
    const n = rets.length || 1;
    const mean = rets.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(n - 1, 1));
    const skew = rets.reduce((a, b) => a + ((b - mean) / sd) ** 3, 0) / n;
    const kurt = rets.reduce((a, b) => a + ((b - mean) / sd) ** 4, 0) / n - 3;
    const sorted = [...rets].sort((a, b) => a - b);
    const var95 = sorted[Math.floor(n * 0.05)] ?? 0;
    return { mean, sd, skew, kurt, var95, worst: sorted[0] ?? 0, best: sorted[sorted.length - 1] ?? 0 };
  }, [rets]);

  const hist = useMemo(() => {
    const bins = Array.from({ length: 41 }, (_, i) => ({ x: +(-5 + i * 0.25).toFixed(2), count: 0 }));
    for (const r of rets) {
      const i = Math.min(40, Math.max(0, Math.round((r + 5) / 0.25)));
      bins[i]!.count++;
    }
    return bins;
  }, [rets]);

  const drawdown = useMemo(() => {
    let peak = 0;
    return downsample(visible).map((p) => {
      peak = Math.max(peak, p.close);
      return { date: p.date, dd: ((p.close - peak) / peak) * 100 };
    });
  }, [visible]);

  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  useEffect(() => {
    ewmaForecaster.forecast(series, 20).then(setForecast);
  }, [series]);

  const items = [
    ["Mean daily return", `${stats.mean.toFixed(3)}%`],
    ["Daily σ", `${stats.sd.toFixed(3)}%`],
    ["Skewness", stats.skew.toFixed(2)],
    ["Excess kurtosis", stats.kurt.toFixed(2)],
    ["1-day VaR (95%)", `${stats.var95.toFixed(2)}%`],
    ["Worst day", `${stats.worst.toFixed(2)}%`],
  ];

  return (
    <>
      <PageHeader title="Historical Analytics" subtitle="Distribution of daily log returns, drawdowns and a baseline volatility forecast." />
      <ControlBar />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {items.map(([l, v]) => (
          <div key={l} className="rounded-lg border bg-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{l}</div>
            <div className="num mt-1 text-lg font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Daily return distribution" sub="Fat tails show up as excess kurtosis">
          <ResponsiveContainer>
            <BarChart data={hist}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="x" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${v}%`} interval={7} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} width={40} />
              <Tooltip {...tip} cursor={{ fill: "var(--accent)" }} />
              <Bar dataKey="count" fill="var(--price)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Drawdown from peak" sub="Depth of declines from running high">
          <ResponsiveContainer>
            <ComposedChart data={drawdown}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} minTickGap={60} tickFormatter={(d) => d.slice(0, 4)} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} width={44} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip {...tip} formatter={(v: number) => `${v.toFixed(2)}%`} />
              <Area dataKey="dd" stroke="var(--loss)" fill="var(--loss)" fillOpacity={0.25} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <Panel title={`Volatility forecast · ${ewmaForecaster.name}`} sub="Baseline model — swap in a GARCH/LSTM service via the forecaster interface">
        {forecast.length ? (
          <ResponsiveContainer>
            <ComposedChart data={forecast}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} width={44} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={["auto", "auto"]} />
              <Tooltip {...tip} formatter={(v: number) => `${v.toFixed(2)}%`} />
              <Line dataKey="upper" stroke="var(--vol)" strokeDasharray="4 3" dot={false} />
              <Line dataKey="predicted_vol" stroke="var(--vol)" strokeWidth={2} dot={false} />
              <Line dataKey="lower" stroke="var(--vol)" strokeDasharray="4 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Computing forecast…</div>
        )}
      </Panel>
    </>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="font-medium">{title}</div>
      <div className="mb-3 text-xs text-muted-foreground">{sub}</div>
      <div className="h-72">{children}</div>
    </div>
  );
}
