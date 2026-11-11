import { describe, expect, it } from "vitest";

import { getPaperSheet } from "./paper-sheet";

describe("getPaperSheet", () => {
  it("labels SkillOptimizer as the first paper", () => {
    const sheet = getPaperSheet("skilloptimizer");
    expect(sheet?.index).toBe(0);
    expect(sheet?.labels).toEqual({ fig: "01", plate: "01 / 02" });
    expect(sheet?.publication.venue).toBe("ICML 2026 AIWILD Workshop");
  });

  it("labels @GrokSet as the second paper", () => {
    const sheet = getPaperSheet("grokset");
    expect(sheet?.index).toBe(1);
    expect(sheet?.labels).toEqual({ fig: "02", plate: "02 / 02" });
    expect(sheet?.publication.venue).toBe("arXiv:2602.21236");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getPaperSheet("no-such-paper")).toBeUndefined();
  });
});
