import { describe, expect, it } from "vitest";

import {
  TAGLINE_FLIP_DURATION_S,
  TAGLINE_FLIP_MS,
  nextTaglineIndex,
} from "./hero-tagline-flip";

describe("nextTaglineIndex", () => {
  it("advances through the three identities and wraps", () => {
    expect(nextTaglineIndex(0, 3)).toBe(1);
    expect(nextTaglineIndex(1, 3)).toBe(2);
    expect(nextTaglineIndex(2, 3)).toBe(0);
  });

  it("is a no-op for a single line", () => {
    expect(nextTaglineIndex(0, 1)).toBe(0);
  });

  it("treats an empty list and non-finite input as the first line", () => {
    expect(nextTaglineIndex(0, 0)).toBe(0);
    expect(nextTaglineIndex(Number.NaN, 3)).toBe(1);
    expect(nextTaglineIndex(Number.POSITIVE_INFINITY, 3)).toBe(1);
  });
});

describe("lede-flip timing", () => {
  it("holds each identity ~3s and rolls in 200ms", () => {
    expect(TAGLINE_FLIP_MS).toBe(3000);
    expect(TAGLINE_FLIP_DURATION_S).toBe(0.2);
  });
});
