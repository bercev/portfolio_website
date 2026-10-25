import { describe, expect, it } from "vitest";

import { isPaperHash, paperAnchorId } from "./paper-anchor";

describe("paperAnchorId", () => {
  it("prefixes the data slug with paper-", () => {
    expect(paperAnchorId("skilloptimizer")).toBe("paper-skilloptimizer");
    expect(paperAnchorId("grokset")).toBe("paper-grokset");
  });
});

describe("isPaperHash", () => {
  it("matches with or without the leading #", () => {
    expect(isPaperHash("#paper-skilloptimizer", "skilloptimizer")).toBe(true);
    expect(isPaperHash("paper-grokset", "grokset")).toBe(true);
  });

  it("rejects other rows, the chapter hash, and empty input", () => {
    expect(isPaperHash("#paper-grokset", "skilloptimizer")).toBe(false);
    expect(isPaperHash("#publications", "skilloptimizer")).toBe(false);
    expect(isPaperHash("", "skilloptimizer")).toBe(false);
    expect(isPaperHash("#", "skilloptimizer")).toBe(false);
  });
});
