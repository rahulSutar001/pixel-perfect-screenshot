// Mock market data + volatility math. Shapes mirror the planned Cloud tables
// (market_indices, crisis_events, user_annotations) so they can be swapped for live queries.

export type IndexName = "Nifty 50" | "Sensex" | "S&P 500";
export const INDICES: IndexName[] = ["Nifty 50", "Sensex", "S&P 500"];

export interface MarketRow {
  date: string; // YYYY-MM-DD
  index_name: IndexName;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CrisisEvent {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  description: string;
  peak_volatility: number;
}

export interface Annotation {
  id: string;
  date_targeted: string;
  annotation_text: string;
  created_at: string;
}

export const CRISES: CrisisEvent[] = [
  { id: 1, name: "Global Financial Crisis", start_date: "2008-09-01", end_date: "2009-03-31", description: "Lehman Brothers collapse triggers a global credit freeze and equity sell-off.", peak_volatility: 72.4 },
  { id: 2, name: "Eurozone Debt Crisis", start_date: "2011-07-15", end_date: "2011-11-30", description: "Sovereign debt fears in Greece, Italy and Spain; US downgraded by S&P.", peak_volatility: 34.1 },
  { id: 3, name: "Taper Tantrum", start_date: "2013-05-20", end_date: "2013-09-15", description: "Fed signals QE taper; emerging-market currencies and bonds sell off.", peak_volatility: 28.6 },
  { id: 4, name: "COVID-19 Market Crash", start_date: "2020-02-20", end_date: "2020-05-15", description: "Pandemic lockdowns cause the fastest bear market in history.", peak_volatility: 81.2 },
  { id: 5, name: "2022 Rate Shock", start_date: "2022-02-15", end_date: "2022-07-15", description: "Russia–Ukraine war and aggressive central bank hikes.", peak_volatility: 31.8 },
  { id: 6, name: "2024 Election Volatility", start_date: "2024-05-25", end_date: "2024-06-20", description: "Indian general election results trigger a sharp one-day crash and rebound.", peak_volatility: 26.3 },
];

const START = "2006-01-02";
const BASE: Record<IndexName, number> = { "Nifty 50": 2800, Sensex: 9300, "S&P 500": 1250 };
const DRIFT: Record<IndexName, number> = { "Nifty 50": 0.00048, Sensex: 0.00047, "S&P 500": 0.00034 };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function stressAt(date: string): { vol: number; drift: number } {
  for (const c of CRISES) {
    if (date >= c.start_date && date <= c.end_date) {
      const s = new Date(c.start_date).getTime();
      const e = new Date(c.end_date).getTime();
      const p = (new Date(date).getTime() - s) / (e - s);
      const intensity = (c.peak_volatility / 100 / Math.sqrt(252)) * (0.7 + Math.sin(Math.PI * p) * 0.6);
      return { vol: intensity, drift: p < 0.45 ? -intensity * 0.35 : intensity * 0.15 };
    }
  }
  return { vol: 0.0095, drift: 0 };
}

const cache = new Map<IndexName, MarketRow[]>();

export function getMarketData(index: IndexName): MarketRow[] {
  const hit = cache.get(index);
  if (hit) return hit;
  const rand = mulberry32(INDICES.indexOf(index) * 9973 + 17);
  const rows: MarketRow[] = [];
  let close = BASE[index];
  const end = new Date("2026-10-23");
  for (let d = new Date(START); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const date = d.toISOString().slice(0, 10);
    const { vol, drift } = stressAt(date);
    const r = DRIFT[index] + drift + vol * gauss(rand);
    const open = close * (1 + vol * 0.3 * gauss(rand));
    close = close * Math.exp(r);
    const hi = Math.max(open, close) * (1 + Math.abs(gauss(rand)) * vol * 0.5);
    const lo = Math.min(open, close) * (1 - Math.abs(gauss(rand)) * vol * 0.5);
    rows.push({
      date,
      index_name: index,
      open: +open.toFixed(2),
      high: +hi.toFixed(2),
      low: +lo.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.round(2e8 * (1 + vol * 40) * (0.7 + rand() * 0.6)),
    });
  }
  cache.set(index, rows);
  return rows;
}

export interface SeriesPoint {
  date: string;
  close: number;
  ret: number | null; // daily log return in %
  vol: number | null; // annualised rolling vol in %
}

/** Daily log return = ln(Ct/Ct-1); annualised vol = stdev(window) * sqrt(252) * 100 (sample stdev). */
export function computeVolatility(closes: number[], window: number): { ret: (number | null)[]; vol: (number | null)[] } {
  const rets: (number | null)[] = closes.map((c, i) => (i === 0 ? null : Math.log(c / closes[i - 1])));
  const vol: (number | null)[] = closes.map(() => null);
  let sum = 0;
  let sumSq = 0;
  for (let i = 1; i < closes.length; i++) {
    const r = rets[i] as number;
    sum += r;
    sumSq += r * r;
    if (i > window) {
      const old = rets[i - window] as number;
      sum -= old;
      sumSq -= old * old;
    }
    if (i >= window) {
      const mean = sum / window;
      const variance = Math.max((sumSq - window * mean * mean) / (window - 1), 0);
      vol[i] = Math.sqrt(variance) * Math.sqrt(252) * 100;
    }
  }
  return { ret: rets.map((r) => (r === null ? null : r * 100)), vol };
}

export function buildSeries(rows: MarketRow[], window: number): SeriesPoint[] {
  const { ret, vol } = computeVolatility(rows.map((r) => r.close), window);
  return rows.map((r, i) => ({ date: r.date, close: r.close, ret: ret[i], vol: vol[i] }));
}

export type RangePreset = "1Y" | "5Y" | "10Y" | "Max";
export function presetStart(preset: RangePreset, lastDate: string): string | null {
  if (preset === "Max") return null;
  const years = { "1Y": 1, "5Y": 5, "10Y": 10 }[preset];
  const d = new Date(lastDate);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/** Downsample for chart performance while preserving vol spikes (keeps max-vol point per bucket). */
export function downsample(points: SeriesPoint[], max = 900): SeriesPoint[] {
  if (points.length <= max) return points;
  const size = Math.ceil(points.length / max);
  const out: SeriesPoint[] = [];
  for (let i = 0; i < points.length; i += size) {
    const bucket = points.slice(i, i + size);
    out.push(bucket.reduce((a, b) => ((b.vol ?? 0) > (a.vol ?? 0) ? b : a)));
  }
  return out;
}
