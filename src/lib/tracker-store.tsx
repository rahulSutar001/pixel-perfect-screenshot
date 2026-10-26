import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  buildSeries,
  getMarketData,
  presetStart,
  type Annotation,
  type IndexName,
  type RangePreset,
  type SeriesPoint,
} from "./market-data";

interface Zoom {
  start: string;
  end: string;
  label?: string;
}

interface TrackerState {
  index: IndexName;
  setIndex: (i: IndexName) => void;
  window: number;
  setWindow: (w: number) => void;
  preset: RangePreset;
  setPreset: (p: RangePreset) => void;
  zoom: Zoom | null;
  setZoom: (z: Zoom | null) => void;
  series: SeriesPoint[]; // full history with vol computed
  visible: SeriesPoint[]; // filtered by preset/zoom
  annotations: Annotation[];
  addAnnotation: (a: Omit<Annotation, "id" | "created_at">) => Promise<Annotation>;
  removeAnnotation: (id: string) => void;
}

const Ctx = createContext<TrackerState | null>(null);
const LS_KEY = "mrt-annotations";

export function TrackerProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<IndexName>("Nifty 50");
  const [window, setWindow] = useState(21);
  const [preset, setPresetRaw] = useState<RangePreset>("Max");
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setAnnotations(JSON.parse(raw));
      else
        setAnnotations([
          { id: "seed-1", date_targeted: "2020-03-23", annotation_text: "Nifty bottoms after lockdown announcement", created_at: new Date().toISOString() },
          { id: "seed-2", date_targeted: "2022-05-04", annotation_text: "RBI off-cycle repo rate hike (+40bps)", created_at: new Date().toISOString() },
        ]);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: Annotation[]) => {
    setAnnotations(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const series = useMemo(() => buildSeries(getMarketData(index), window), [index, window]);

  const visible = useMemo(() => {
    if (zoom) return series.filter((p) => p.date >= zoom.start && p.date <= zoom.end);
    const start = presetStart(preset, series[series.length - 1]!.date);
    return start ? series.filter((p) => p.date >= start) : series;
  }, [series, preset, zoom]);

  const value: TrackerState = {
    index,
    setIndex,
    window,
    setWindow,
    preset,
    setPreset: (p) => {
      setZoom(null);
      setPresetRaw(p);
    },
    zoom,
    setZoom,
    series,
    visible,
    annotations,
    addAnnotation: async (a) => {
      // Mock network round-trip to the annotations table.
      await new Promise((r) => setTimeout(r, 1100));
      const created: Annotation = { ...a, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      persist([...annotations, created].sort((x, y) => x.date_targeted.localeCompare(y.date_targeted)));
      return created;
    },
    removeAnnotation: (id) => persist(annotations.filter((a) => a.id !== id)),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTracker() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTracker outside TrackerProvider");
  return v;
}
