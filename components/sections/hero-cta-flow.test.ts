import { describe, expect, it } from "vitest";

import { HERO_CTA_PRESS_SCALE } from "./hero-cta-flow";

describe("HERO_CTA_PRESS_SCALE", () => {
  it("is the reel-4 press scale", () => {
    expect(HERO_CTA_PRESS_SCALE).toBe(0.97);
  });
});
