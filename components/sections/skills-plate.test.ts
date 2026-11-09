import { describe, expect, it } from "vitest";

import { dealDelay, plateIndex, seriesKicker, seriesLetter } from "./skills-plate";

describe("plateIndex", () => {
  it("numbers plates from SK-01", () => {
    expect(plateIndex(0)).toBe("SK-01");
    expect(plateIndex(17)).toBe("SK-18");
  });
});

describe("seriesLetter", () => {
  it("letters series from A in content order", () => {
    expect(seriesLetter(0)).toBe("A");
    expect(seriesLetter(3)).toBe("D");
  });
});

describe("seriesKicker", () => {
  it("counts items with the right noun", () => {
    expect(seriesKicker(0, 7)).toBe("SERIES A · 7 ITEMS");
    expect(seriesKicker(1, 1)).toBe("SERIES B · 1 ITEM");
  });
});

describe("dealDelay", () => {
  it("staggers 45ms per plate across each row of three, then wraps", () => {
    expect(dealDelay(0)).toBe(0);
    expect(dealDelay(1)).toBeCloseTo(0.045, 10);
    expect(dealDelay(2)).toBeCloseTo(0.09, 10);
    expect(dealDelay(3)).toBe(0);
  });
});
