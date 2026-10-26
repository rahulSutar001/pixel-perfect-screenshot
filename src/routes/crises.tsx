import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useZoomToCrisis } from "@/components/crisis-cards";
import { PageHeader } from "@/components/page-header";
import { CRISES } from "@/lib/market-data";
import { useTracker } from "@/lib/tracker-store";

export const Route = createFileRoute("/crises")({
  head: () => ({
    meta: [
      { title: "Crisis Deep-Dive — VolTrack" },
      { name: "description", content: "Drawdown, peak volatility and recovery for historic market crises." },
      { property: "og:title", content: "Crisis Deep-Dive — VolTrack" },
      { property: "og:description", content: "Drawdown, peak volatility and recovery for historic market crises." },
    ],
  }),
  component: Crises,
});

function Crises() {
  const { series, index } = useTracker();
  const zoomTo = useZoomToCrisis();
  const navigate = useNavigate();

  const rows = useMemo(
    () =>
      CRISES.map((c) => {
        const win = series.filter((p) => p.date >= c.start_date && p.date <= c.end_date);
        if (!win.length) return { c, dd: 0, peakVol: 0, worst: 0, days: 0, recovery: null as number | null };
        let peak = win[0]!.close;
        let dd = 0;
        for (const p of win) {
          peak = Math.max(peak, p.close);
          dd = Math.min(dd, (p.close - peak) / peak);
        }
        const preHigh = Math.max(...win.map((p) => p.close));
        const after = series.findIndex((p) => p.date > c.end_date && p.close >= preHigh);
        const endIdx = series.findIndex((p) => p.date > c.end_date);
        return {
          c,
          dd: dd * 100,
          peakVol: Math.max(...win.map((p) => p.vol ?? 0)),
          worst: Math.min(...win.map((p) => p.ret ?? 0)),
          days: win.length,
          recovery: after > 0 && endIdx > 0 ? after - endIdx : null,
        };
      }),
    [series],
  );

  return (
    <>
      <PageHeader title="Crisis Deep-Dive" subtitle={`How ${index} behaved through each historic shock (computed from loaded data).`} />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Window</TableHead>
              <TableHead className="text-right">Trading days</TableHead>
              <TableHead className="text-right">Max drawdown</TableHead>
              <TableHead className="text-right">Worst day</TableHead>
              <TableHead className="text-right">Peak vol</TableHead>
              <TableHead className="text-right">Recovery (days)</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ c, dd, peakVol, worst, days, recovery }) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  <div className="max-w-sm text-xs text-muted-foreground">{c.description}</div>
                </TableCell>
                <TableCell className="num text-xs whitespace-nowrap">
                  {c.start_date} → {c.end_date}
                </TableCell>
                <TableCell className="num text-right">{days}</TableCell>
                <TableCell className="num text-right text-loss">{dd.toFixed(1)}%</TableCell>
                <TableCell className="num text-right text-loss">{worst.toFixed(2)}%</TableCell>
                <TableCell className="num text-right text-vol">{peakVol.toFixed(1)}%</TableCell>
                <TableCell className="num text-right">{recovery ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      zoomTo(c);
                      navigate({ to: "/" });
                    }}
                  >
                    View chart
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
