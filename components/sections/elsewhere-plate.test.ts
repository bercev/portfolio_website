import { describe, expect, it } from "vitest";

import {
  elsewhereDrawDelay,
  elsewhereEntryCount,
  elsewhereEntryNumber,
} from "./elsewhere-plate";

describe("elsewhereEntryNumber", () => {
  it("numbers entries 1-based and zero-padded", () => {
    expect(elsewhereEntryNumber(0)).toBe("01");
    expect(elsewhereEntryNumber(3)).toBe("04");
  });
});

describe("elsewhereEntryCount", () => {
  it("counts the profile links plus the motion-version link", () => {
    expect(elsewhereEntryCount(3)).toBe("04");
  });
});

describe("elsewhereDrawDelay", () => {
  it("staggers the row press 45ms per row after a 0.1s lead", () => {
    expect(elsewhereDrawDelay(0)).toBeCloseTo(0.1, 10);
    expect(elsewhereDrawDelay(1)).toBeCloseTo(0.145, 10);
    expect(elsewhereDrawDelay(3)).toBeCloseTo(0.235, 10);
  });
});
