import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleDashed, FileUp, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { CRISES, getMarketData, INDICES, type MarketRow } from "@/lib/market-data";
import { useTracker } from "@/lib/tracker-store";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Data & Settings — VolTrack" },
      { name: "description", content: "Upload market CSV data and check table sync status." },
      { property: "og:title", content: "Data & Settings — VolTrack" },
      { property: "og:description", content: "Upload market CSV data and check table sync status." },
    ],
  }),
  component: DataCenter,
});

function parseCsv(text: string): Partial<MarketRow>[] {
  const [head = "", ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split(",").map((c) => c.trim().toLowerCase());
  return lines
    .filter(Boolean)
    .slice(0, 50000)
    .map((l) => {
      const v = l.split(",");
      const o: Record<string, string | number> = {};
      cols.forEach((c, i) => (o[c] = ["open", "high", "low", "close", "volume"].includes(c) ? Number(v[i]) : (v[i] ?? "").trim()));
      return o as Partial<MarketRow>;
    });
}

function DataCenter() {
  const { index, annotations } = useTracker();
  const rows = getMarketData(index);
  const [uploaded, setUploaded] = useState<Partial<MarketRow>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const connected = Boolean(import.meta.env["VITE_SUPABASE_URL"]);

  const handleFile = async (f?: File) => {
    if (!f) return;
    if (!f.name.endsWith(".csv")) { toast.error("Please upload a .csv file"); return; }
    const parsed = parseCsv(await f.text());
    if (!parsed.length || !("close" in parsed[0]!) || !("date" in parsed[0]!)) { toast.error("CSV needs at least date and close columns"); return; }
    setFileName(f.name);
    setUploaded(parsed);
    toast.success(`Parsed ${parsed.length.toLocaleString()} rows from ${f.name}`);
  };

  const sync = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1400));
    setBusy(false);
    toast.success("Sync complete", { description: "Tables are up to date (mock mode)." });
  };

  const tables = [
    { name: "market_indices", rows: INDICES.reduce((a, i) => a + getMarketData(i).length, 0) },
    { name: "crisis_events", rows: CRISES.length },
    { name: "user_annotations", rows: annotations.length },
  ];
  const preview = (uploaded ?? rows).slice(0, 10);

  return (
    <>
      <PageHeader title="Data Management Center" subtitle="Upload index history and monitor table sync status." />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium">Backend connection</div>
            <Badge variant={connected ? "default" : "secondary"} className="gap-1">
              {connected ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}
              {connected ? "Connected" : "Mock mode"}
            </Badge>
          </div>
          <div className="space-y-2">
            {tables.map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-md border bg-background/40 px-3 py-2">
                <span className="num text-sm">{t.name}</span>
                <span className="num text-sm text-muted-foreground">{t.rows.toLocaleString()} rows</span>
              </div>
            ))}
          </div>
          <Button onClick={sync} disabled={busy} variant="outline" className="mt-4 w-full gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {busy ? "Syncing…" : "Sync now"}
          </Button>
          {!connected && <p className="mt-3 text-xs text-muted-foreground">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to go live.</p>}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => input.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${drag ? "border-primary bg-accent" : "hover:border-primary/60"}`}
        >
          <input ref={input} type="file" accept=".csv" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          {uploaded ? <FileUp className="size-10 text-gain" /> : <UploadCloud className="size-10 text-muted-foreground" />}
          <div className="font-medium">{uploaded ? fileName : "Drop a market CSV here"}</div>
          <div className="text-xs text-muted-foreground">Columns: date, index_name, open, high, low, close, volume</div>
          {uploaded && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setUploaded(null);
              }}
            >
              Clear upload
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <div className="font-medium">{uploaded ? `Preview · ${fileName}` : `market_indices · ${index}`}</div>
          <div className="text-xs text-muted-foreground">First 10 rows</div>
        </div>
        {preview.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No rows yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {["date", "index_name", "open", "high", "low", "close", "volume"].map((h) => (
                  <TableHead key={h} className={h === "date" || h === "index_name" ? "" : "text-right"}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((r, i) => (
                <TableRow key={i} className="num text-xs">
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="font-sans">{r.index_name ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.open?.toFixed?.(2) ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.high?.toFixed?.(2) ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.low?.toFixed?.(2) ?? "—"}</TableCell>
                  <TableCell className="text-right text-price">{r.close?.toFixed?.(2) ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.volume?.toLocaleString() ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
