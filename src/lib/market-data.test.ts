import { describe, expect, it } from "vitest";
import { computeVolatility } from "./market-data";

describe("computeVolatility", () => {
  it("daily return is ln(Ct/Ct-1) in percent", () => {
    const { ret } = computeVolatility([100, 110], 2);
    expect(ret[1]).toBeCloseTo(Math.log(1.1) * 100, 10);
  });

  it("annualised vol = sample stdev of window returns * sqrt(252) * 100", () => {
    const closes = [100, 101, 99, 102, 100];
    const { vol } = computeVolatility(closes, 3);
    const r = [1, 2, 3].map((i) => Math.log(closes[i] / closes[i - 1]));
    const m = r.reduce((a, b) => a + b) / 3;
    const sd = Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / 2);
    expect(vol[2]).toBeNull();
    expect(vol[3]).toBeCloseTo(sd * Math.sqrt(252) * 100, 8);
  });
});
