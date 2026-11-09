import { describe, expect, it } from "vitest";

import {
  courseworkCountLabel,
  courseworkDrawDelay,
  courseworkPartLabel,
} from "./about-coursework";

describe("courseworkPartLabel", () => {
  it("numbers the course parts 1-based and zero-padded", () => {
    expect(courseworkPartLabel(0)).toBe("CW-01");
    expect(courseworkPartLabel(1)).toBe("CW-02");
    expect(courseworkPartLabel(6)).toBe("CW-07");
  });
});

describe("courseworkCountLabel", () => {
  it("zero-pads the part count", () => {
    expect(courseworkCountLabel(7)).toBe("07 parts");
    expect(courseworkCountLabel(12)).toBe("12 parts");
  });
});

describe("courseworkDrawDelay", () => {
  it("starts just after the list enters view, staggered per part", () => {
    expect(courseworkDrawDelay(0)).toBe(0.1);
    expect(courseworkDrawDelay(1)).toBeCloseTo(0.145, 10);
    expect(courseworkDrawDelay(6)).toBeCloseTo(0.37, 10);
  });
});
