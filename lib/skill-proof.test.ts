import { describe, expect, it } from "vitest";

import { skillProofHref } from "./skill-proof";

/**
 * Every distinct note in data/content.ts, mapped exactly. If a note is
 * added or reworded, this test fails until the mapping is reconsidered —
 * the mapping must follow the wording, not drift from it.
 */
describe("skillProofHref", () => {
  it.each([
    ["Discord bot + research", "#projects"],
    ["Research area — see publications", "#publications"],
    ["Internship + research", null],
    ["Shipped in the Discord bot", "#projects"],
    ["Shipped in Vitae", "#projects"],
    ["This site's test suite", null],
    ["Daily driver", null],
    ["Tutored DSA at UC Santa Cruz", null],
  ] as const)("maps %p to %p", (note, expected) => {
    expect(skillProofHref(note)).toBe(expected);
  });

  it("returns null for empty and non-string input", () => {
    expect(skillProofHref("")).toBeNull();
    // @ts-expect-error deliberate degenerate input
    expect(skillProofHref(undefined)).toBeNull();
  });

  it("matches case-insensitively", () => {
    expect(skillProofHref("SHIPPED IN VITAE")).toBe("#projects");
  });
});
