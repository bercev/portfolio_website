import { describe, expect, it } from "vitest";

import { ECG_BEAT_MS, ecgValue } from "./contact-ecg";

describe("ecgValue", () => {
  it("peaks at the R spike (phase 0.20)", () => {
    expect(ecgValue(0.2)).toBeGreaterThan(0.9);
    expect(ecgValue(0.2)).toBeLessThanOrEqual(1.05);
  });

  it("sits on the baseline between beats", () => {
    expect(Math.abs(ecgValue(0))).toBeLessThan(0.05);
    expect(Math.abs(ecgValue(0.7))).toBeLessThan(0.05);
  });

  it("carries a small P wave before the QRS complex", () => {
    expect(ecgValue(0.12)).toBeGreaterThan(0.1);
    expect(ecgValue(0.12)).toBeLessThan(0.2);
  });

  it("carries a broad T wave after the QRS complex", () => {
    expect(ecgValue(0.36)).toBeGreaterThan(0.2);
    expect(ecgValue(0.36)).toBeLessThan(0.35);
  });

  it("is periodic in the beat (one beat = ECG_BEAT_MS)", () => {
    expect(ecgValue(0.2)).toBe(ecgValue(1.2));
    expect(ecgValue(0.36)).toBe(ecgValue(-0.64));
    expect(ECG_BEAT_MS).toBe(1000);
  });
});
