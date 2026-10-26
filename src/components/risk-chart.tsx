import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { CRISES, downsample, type SeriesPoint } from "@/lib/market-data";
import { useTracker } from "@/lib/tracker-store";

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
};

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as SeriesPoint;
  return (
    <div className="num min-w-48 rounded-md border bg-popover p-3 text-xs shadow-xl">
      <div className="mb-2 font-sans font-medium text-foreground">
        {new Date(p.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
      <Row label="Close" value={p.close.toLocaleString("en-IN", { maximumFractionDigits: 2 })} cls="text-price" />
      <Row
        label="Daily return"
        value={p.ret == null ? "—" : `${p.ret >= 0 ? "+" : ""}${p.ret.toFixed(2)}%`}
        cls={p.ret != null && p.ret < 0 ? "text-loss" : "text-gain"}
      />
      <Row label="Ann. vol" value={p.vol == null ? "—" : `${p.vol.toFixed(2)}%`} cls="text-vol" />
    </div>
  );
}

function Row({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="font-sans text-muted-foreground">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}

export function RiskChart({ height = 440 }: { height?: number }) {
  const { visible, annotations, window } = useTracker();
  const data = useMemo(() => downsample(visible), [visible]);
  if (!data.length) return <div className="grid h-64 place-items-center text-muted-foreground">No data in range</div>;
  const first = data[0].date;
  const last = data[data.length - 1].date;
  const crises = CRISES.filter((c) => c.end_date >= first && c.start_date <= last);
  const notes = annotations.filter((a) => a.date_targeted >= first && a.date_targeted <= last);
  const snap = (d: string) => data.find((p) => p.date >= d)?.date ?? last;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--vol)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--vol)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} stroke="var(--muted-foreground)" fontSize={11} minTickGap={48} tickLine={false} />
          <YAxis
            yAxisId="price"
            stroke="var(--price)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0))}
            width={48}
          />
          <YAxis yAxisId="vol" orientation="right" stroke="var(--vol)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={44} />
          {crises.map((c) => (
            <ReferenceArea
              key={c.id}
              yAxisId="price"
              x1={snap(c.start_date)}
              x2={snap(c.end_date)}
              fill="var(--loss)"
              fillOpacity={0.1}
              stroke="var(--loss)"
              strokeOpacity={0.3}
              label={{ value: c.name, position: "insideTopLeft", fill: "var(--loss)", fontSize: 10 }}
            />
          ))}
          {notes.map((n) => (
            <ReferenceLine key={n.id} yAxisId="price" x={snap(n.date_targeted)} stroke="var(--gain)" strokeDasharray="4 3" label={{ value: "✎", fill: "var(--gain)", position: "top", fontSize: 12 }} />
          ))}
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
          <Area yAxisId="vol" type="monotone" dataKey="vol" stroke="var(--vol)" strokeWidth={1.25} fill="url(#volFill)" isAnimationActive={false} name={`${window}D vol`} connectNulls />
          <Line yAxisId="price" type="monotone" dataKey="close" stroke="var(--price)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
