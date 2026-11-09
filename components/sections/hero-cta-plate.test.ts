import { describe, expect, it } from "vitest";

import { HERO_CTA_PRESS_SCALE, ctaTraceTiming } from "./hero-cta-plate";

describe("ctaTraceTiming", () => {
  it("draws after the plate entrance starts and lasts 0.9s like the sheet trace", () => {
    const t = ctaTraceTiming();
    expect(t.delay).toBeGreaterThan(0.21); // hero wrap entrance delay
    expect(t.duration).toBe(0.9);
    expect(t.fade).toBe(0.4);
  });
});

describe("HERO_CTA_PRESS_SCALE", () => {
  it("is the reel-4 press scale", () => {
    expect(HERO_CTA_PRESS_SCALE).toBe(0.97);
  });
});
