import { describe, expect, it } from "vitest";

import {
  courseworkCountLabel,
  courseworkDrawDelay,
} from "./about-coursework";

describe("courseworkCountLabel", () => {
  it("zero-pads the course count", () => {
    expect(courseworkCountLabel(7)).toBe("07 courses");
    expect(courseworkCountLabel(12)).toBe("12 courses");
  });
});

describe("courseworkDrawDelay", () => {
  it("starts just after the list enters view, staggered per part", () => {
    expect(courseworkDrawDelay(0)).toBe(0.1);
    expect(courseworkDrawDelay(1)).toBeCloseTo(0.145, 10);
    expect(courseworkDrawDelay(6)).toBeCloseTo(0.37, 10);
  });
});
