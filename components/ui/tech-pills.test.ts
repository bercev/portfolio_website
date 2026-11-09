import { describe, expect, it } from "vitest";

import { expTapePartLabel, expTapePopDelay } from "./tech-pills";

describe("expTapePartLabel", () => {
  it("numbers the parts EX-01… in order", () => {
    expect(expTapePartLabel(0, 4)).toBe("EX-01");
    expect(expTapePartLabel(1, 4)).toBe("EX-02");
    expect(expTapePartLabel(3, 4)).toBe("EX-04");
  });

  it("wraps the duplicated loop copy back onto the original numbers", () => {
    expect(expTapePartLabel(4, 4)).toBe("EX-01");
    expect(expTapePartLabel(7, 4)).toBe("EX-04");
  });

  it("is EX-01 when there are no technologies", () => {
    expect(expTapePartLabel(3, 0)).toBe("EX-01");
  });
});

describe("expTapePopDelay", () => {
  it("leads 0.1s then staggers 30ms per part", () => {
    expect(expTapePopDelay(0, 4)).toBeCloseTo(0.1, 10);
    expect(expTapePopDelay(1, 4)).toBeCloseTo(0.13, 10);
    expect(expTapePopDelay(3, 4)).toBeCloseTo(0.19, 10);
  });

  it("pops the duplicated copy in phase with the original", () => {
    expect(expTapePopDelay(4, 4)).toBeCloseTo(0.1, 10);
    expect(expTapePopDelay(7, 4)).toBeCloseTo(0.19, 10);
  });
});
