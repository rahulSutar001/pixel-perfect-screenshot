import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { INDICES, type IndexName, type RangePreset } from "@/lib/market-data";
import { useTracker } from "@/lib/tracker-store";

const WINDOWS = [21, 50, 252];

export function ControlBar() {
  const t = useTracker();
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-lg border bg-card p-4">
      <div className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Index</div>
        <Select value={t.index} onValueChange={(v) => t.setIndex(v as IndexName)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INDICES.map((i) => (
              <SelectItem key={i} value={i}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-64 flex-1 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>Rolling window</span>
          <span className="num text-sm normal-case text-vol">{t.window} days</span>
        </div>
        <div className="flex items-center gap-3">
          <Slider min={10} max={252} step={1} value={[t.window]} onValueChange={([v]) => t.setWindow(v ?? 21)} className="flex-1" />
          <div className="flex gap-1">
            {WINDOWS.map((w) => (
              <Button key={w} size="sm" variant={t.window === w ? "default" : "outline"} className="num h-7 px-2 text-xs" onClick={() => t.setWindow(w)}>
                {w}D
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Range</div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={t.zoom ? "" : t.preset}
          onValueChange={(v) => v && t.setPreset(v as RangePreset)}
        >
          {(["1Y", "5Y", "10Y", "Max"] as RangePreset[]).map((p) => (
            <ToggleGroupItem key={p} value={p} className="num px-3 text-xs">
              {p}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {t.zoom && (
        <Button variant="secondary" size="sm" onClick={() => t.setZoom(null)} className="gap-1">
          Zoom: {t.zoom.label ?? `${t.zoom.start} → ${t.zoom.end}`} <X className="size-3" />
        </Button>
      )}
    </div>
  );
}
