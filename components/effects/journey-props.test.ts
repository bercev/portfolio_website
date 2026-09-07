import { describe, expect, it } from "vitest";

import { buildJourneyPropManifest } from "@/data/journey-props";
import { iconForTech } from "@/lib/tech-icons";

import { propPresence } from "./journey-props";

describe("propPresence", () => {
  it("peaks at the chapter path t", () => {
    expect(propPresence(0.33, 0.33)).toBe(1);
  });

  it("fades to zero outside the window", () => {
    expect(propPresence(0.5, 0.33, 0.11)).toBe(0);
    expect(propPresence(0.1, 0.33, 0.11)).toBe(0);
  });

  it("ramps smoothly inside the window", () => {
    const mid = propPresence(0.33 + 0.055, 0.33, 0.11);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe("journey tech badges", () => {
  it("curates only stack names that have Simple Icons glyphs", () => {
    const manifest = buildJourneyPropManifest();
    expect(manifest.tech.length).toBeGreaterThan(6);
    for (const tech of manifest.tech) {
      expect(iconForTech(tech.label)).not.toBeNull();
    }
  });
});
