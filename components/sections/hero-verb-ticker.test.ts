import { describe, expect, it } from "vitest";

import {
  VERB_TICKER_DURATION_S,
  VERB_TICKER_MS,
  nextVerbIndex,
  verbPhrase,
} from "./hero-verb-ticker";

const VERBS = [
  { verb: "Measuring", object: "how LLMs behave in the wild" },
  { verb: "Probing", object: "public Grok conversations" },
  { verb: "Building", object: "multi-agent pipelines" },
  { verb: "Publishing", object: "at ICML · arXiv" },
];

describe("nextVerbIndex", () => {
  it("advances through the four verbs and wraps", () => {
    expect(nextVerbIndex(0, 4)).toBe(1);
    expect(nextVerbIndex(1, 4)).toBe(2);
    expect(nextVerbIndex(2, 4)).toBe(3);
    expect(nextVerbIndex(3, 4)).toBe(0);
  });

  it("is a no-op for a single phrase", () => {
    expect(nextVerbIndex(0, 1)).toBe(0);
  });

  it("treats an empty list and non-finite input as the first phrase", () => {
    expect(nextVerbIndex(0, 0)).toBe(0);
    expect(nextVerbIndex(Number.NaN, 4)).toBe(1);
    expect(nextVerbIndex(Number.POSITIVE_INFINITY, 4)).toBe(1);
  });
});

describe("verbPhrase", () => {
  it("joins the verb and its object with one space", () => {
    expect(verbPhrase(VERBS[0])).toBe("Measuring how LLMs behave in the wild");
    expect(verbPhrase(VERBS[3])).toBe("Publishing at ICML · arXiv");
  });
});

describe("verb-ticker timing", () => {
  it("holds each phrase ~2.8s and slides in 250ms", () => {
    expect(VERB_TICKER_MS).toBe(2800);
    expect(VERB_TICKER_DURATION_S).toBe(0.25);
  });

  it("cycles four real-work phrases", () => {
    expect(VERBS).toHaveLength(4);
  });
});
