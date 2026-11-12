import { describe, expect, it } from "vitest";

import {
  THESIS_BASE_DELAY_S,
  THESIS_WORD_DURATION_S,
  THESIS_WORD_STAGGER_MS,
  thesisWordDelay,
  thesisWords,
} from "./hero-thesis";

const THESIS =
  "I study how people really talk to AI in the wild — and how AI gets better at the skills they ask for.";

describe("thesisWords", () => {
  it("splits the thesis into 23 words, em-dash as its own word", () => {
    const words = thesisWords(THESIS);
    expect(words).toHaveLength(23);
    expect(words[0]).toBe("I");
    expect(words[10]).toBe("wild");
    expect(words[11]).toBe("—");
    expect(words[22]).toBe("for.");
  });

  it("drops empty tokens from extra whitespace", () => {
    expect(thesisWords("  one   two  ")).toEqual(["one", "two"]);
    expect(thesisWords("")).toEqual([]);
  });
});

describe("thesisWordDelay", () => {
  it("starts at the base delay and staggers 25ms per word", () => {
    expect(thesisWordDelay(0)).toBeCloseTo(THESIS_BASE_DELAY_S, 10);
    expect(thesisWordDelay(1)).toBeCloseTo(0.145, 10);
    expect(thesisWordDelay(22)).toBeCloseTo(0.67, 10);
  });

  it("falls back to the base delay for degenerate indices", () => {
    expect(thesisWordDelay(-1)).toBeCloseTo(THESIS_BASE_DELAY_S, 10);
    expect(thesisWordDelay(Number.NaN)).toBeCloseTo(THESIS_BASE_DELAY_S, 10);
    expect(thesisWordDelay(Number.POSITIVE_INFINITY)).toBeCloseTo(
      THESIS_BASE_DELAY_S,
      10,
    );
  });
});

describe("thesis timing constants", () => {
  it("is a fast word rise on a short stagger (reel-4 timing craft)", () => {
    expect(THESIS_WORD_DURATION_S).toBe(0.2);
    expect(THESIS_WORD_STAGGER_MS).toBe(25);
    // Whole 23-word cascade lands inside ~0.8s.
    expect(thesisWordDelay(22) + THESIS_WORD_DURATION_S).toBeLessThan(0.9);
  });
});
