import { describe, expect, it } from "vitest";

import { portfolio } from "@/data/content";

import { thesisWordDelay, thesisWords } from "./hero-thesis";

describe("hero thesis copy", () => {
  it("is one sentence from his paper topics only", () => {
    const thesis = portfolio.hero.thesis;
    expect(thesisWords(thesis)).toHaveLength(23);
    expect(thesis).toContain("in the wild");
    expect(thesis).toContain("gets better at the skills");
    expect(thesis.trim().endsWith(".")).toBe(true);
  });
});

describe("hero thesis timing", () => {
  it("starts before the meta line's 0.15s entrance", () => {
    expect(thesisWordDelay(0)).toBeLessThan(0.15);
  });
});
