import { describe, expect, it } from "vitest";

import {
  HERO_SIGNAL_FLOW_DURATION,
  signalRowDelay,
} from "./hero-signals-flow";

describe("signalRowDelay", () => {
  it("starts after the dl entrance and staggers 60ms per row", () => {
    expect(signalRowDelay(0)).toBeCloseTo(0.5, 10);
    expect(signalRowDelay(1)).toBeCloseTo(0.56, 10);
    expect(signalRowDelay(2)).toBeCloseTo(0.62, 10);
  });
});

describe("HERO_SIGNAL_FLOW_DURATION", () => {
  it("is a half-second fade-rise", () => {
    expect(HERO_SIGNAL_FLOW_DURATION).toBe(0.5);
  });
});
