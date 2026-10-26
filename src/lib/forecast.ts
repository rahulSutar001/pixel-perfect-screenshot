// Plug-in point for ML volatility forecasts (e.g. a Python GARCH/LSTM service).
// Input/output are plain arrays so any inference API can return this shape.
import type { SeriesPoint } from "./market-data";

export interface ForecastPoint {
  date: string;
  predicted_vol: number; // annualised %
  lower?: number;
  upper?: number;
}

export interface VolForecaster {
  name: string;
  forecast(history: SeriesPoint[], horizon: number): Promise<ForecastPoint[]>;
}

/** Baseline EWMA (RiskMetrics, lambda=0.94) forecaster — replace with a remote model endpoint. */
export const ewmaForecaster: VolForecaster = {
  name: "EWMA (λ=0.94)",
  async forecast(history, horizon) {
    const lambda = 0.94;
    let variance = 0;
    for (const p of history) if (p.ret != null) variance = lambda * variance + (1 - lambda) * (p.ret / 100) ** 2;
    const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;
    const last = new Date(history[history.length - 1]!.date);
    return Array.from({ length: horizon }, (_, i) => {
      const d = new Date(last);
      d.setUTCDate(d.getUTCDate() + i + 1);
      const band = vol * 0.08 * Math.sqrt(i + 1);
      return { date: d.toISOString().slice(0, 10), predicted_vol: vol, lower: vol - band, upper: vol + band };
    });
  },
};
