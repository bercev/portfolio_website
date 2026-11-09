import { describe, expect, it } from "vitest";

import { revDrawDelay, revLetter } from "./experience-revision";

describe("revLetter", () => {
  it("gives the newest entry the highest letter, oldest is A", () => {
    expect(revLetter(0, 4)).toBe("D");
    expect(revLetter(1, 4)).toBe("C");
    expect(revLetter(2, 4)).toBe("B");
    expect(revLetter(3, 4)).toBe("A");
  });

  it("a single entry is REV A", () => {
    expect(revLetter(0, 1)).toBe("A");
  });

  it("never renders below A", () => {
    expect(revLetter(9, 4)).toBe("A");
    expect(revLetter(0, 0)).toBe("A");
  });
});

describe("revDrawDelay", () => {
  it("starts just after the row enters view, staggered per row", () => {
    expect(revDrawDelay(0)).toBe(0.1);
    expect(revDrawDelay(1)).toBeCloseTo(0.13, 10);
  });
});
