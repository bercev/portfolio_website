import { describe, expect, it } from "vitest";

import {
  AUTHOR_DIAL_CIRCUMFERENCE,
  AUTHOR_DIAL_RADIUS,
  authorDialDashOffset,
  authorDialDelay,
  authorDialDigitDelay,
  authorDialFraction,
  authorDialPad,
  authorDialPosition,
  authorDialTickAngle,
  authorOrdinal,
  rollingDigitOffset,
} from "./author-dial";

const NINE = [
  "Nicholas Crispino",
  "Shubham Gaur",
  "Xuefang Yang",
  "Angela Yu",
  "Berat Ercevik",
  "Clara Sapugay",
  "Yujin Potter",
  "Dawn Song",
  "Chenguang Wang",
].map((name) => ({ name }));

const EIGHT = [
  "Matteo Migliarini",
  "Berat Ercevik",
  "Oluwagbemike Olowe",
  "Saira Fatima",
  "Sarah Zhao",
  "Minh Anh Le",
  "Vasu Sharma",
  "Ashwinee Panda",
].map((name) => ({ name }));

describe("authorDialPosition", () => {
  it("reads the real slots from content.ts: 5th of 9, 2nd of 8", () => {
    expect(authorDialPosition(NINE)).toEqual({ position: 5, total: 9 });
    expect(authorDialPosition(EIGHT)).toEqual({ position: 2, total: 8 });
  });

  it("returns null when the owner is not listed — never invents a slot", () => {
    expect(authorDialPosition([{ name: "Ada Lovelace" }])).toBeNull();
    expect(authorDialPosition([])).toBeNull();
  });
});

describe("authorOrdinal", () => {
  it("uses 1ST / 2ND / 3RD and TH otherwise, with the teen exception", () => {
    expect(authorOrdinal(1)).toBe("1ST");
    expect(authorOrdinal(2)).toBe("2ND");
    expect(authorOrdinal(3)).toBe("3RD");
    expect(authorOrdinal(4)).toBe("4TH");
    expect(authorOrdinal(5)).toBe("5TH");
    expect(authorOrdinal(11)).toBe("11TH");
    expect(authorOrdinal(12)).toBe("12TH");
    expect(authorOrdinal(13)).toBe("13TH");
    expect(authorOrdinal(21)).toBe("21ST");
    expect(authorOrdinal(22)).toBe("22ND");
    expect(authorOrdinal(23)).toBe("23RD");
  });
});

describe("authorDialPad", () => {
  it("zero-pads the position to two digits", () => {
    expect(authorDialPad(5)).toBe("05");
    expect(authorDialPad(2)).toBe("02");
    expect(authorDialPad(12)).toBe("12");
  });
});

describe("authorDialFraction", () => {
  it("is position / total, clamped to the ring", () => {
    expect(authorDialFraction(5, 9)).toBeCloseTo(5 / 9, 10);
    expect(authorDialFraction(2, 8)).toBeCloseTo(0.25, 10);
    expect(authorDialFraction(0, 9)).toBe(0);
    expect(authorDialFraction(9, 9)).toBe(1);
    expect(authorDialFraction(10, 9)).toBe(1);
    expect(authorDialFraction(1, 0)).toBe(0);
  });
});

describe("authorDialTickAngle", () => {
  it("spaces one tick per author, starting at the top", () => {
    expect(authorDialTickAngle(0, 9)).toBe(0);
    expect(authorDialTickAngle(4, 9)).toBeCloseTo(160, 10);
    expect(authorDialTickAngle(1, 8)).toBeCloseTo(45, 10);
    expect(authorDialTickAngle(0, 0)).toBe(0);
  });
});

describe("authorDialDashOffset", () => {
  it("hides the arc at progress 0 and shows exactly the fraction at 1", () => {
    const c = AUTHOR_DIAL_CIRCUMFERENCE;
    expect(authorDialDashOffset(c, 5 / 9, 0)).toBeCloseTo(c, 10);
    expect(authorDialDashOffset(c, 5 / 9, 1)).toBeCloseTo(c * (1 - 5 / 9), 10);
    expect(authorDialDashOffset(c, 0.25, 0.5)).toBeCloseTo(c * (1 - 0.125), 10);
  });

  it("clamps progress outside [0, 1]", () => {
    const c = AUTHOR_DIAL_CIRCUMFERENCE;
    expect(authorDialDashOffset(c, 0.5, -1)).toBeCloseTo(c, 10);
    expect(authorDialDashOffset(c, 0.5, 2)).toBeCloseTo(c * 0.5, 10);
  });

  it("the ring geometry is the 22px radius in the 60px box", () => {
    expect(AUTHOR_DIAL_RADIUS).toBe(22);
    expect(AUTHOR_DIAL_CIRCUMFERENCE).toBeCloseTo(2 * Math.PI * 22, 10);
  });
});

describe("rollingDigitOffset", () => {
  it("sits digit d at -d em in the 1em-tall strip", () => {
    expect(rollingDigitOffset(0)).toBe("0em");
    expect(rollingDigitOffset(5)).toBe("-5em");
    expect(rollingDigitOffset(9)).toBe("-9em");
  });
});

describe("authorDialDelay", () => {
  it("starts after the venue stamp press, staggered per plate", () => {
    expect(authorDialDelay(0)).toBe(0.85);
    expect(authorDialDelay(1)).toBeCloseTo(0.88, 10);
  });

  it("rolls the digits after the arc is half drawn, staggered per digit", () => {
    expect(authorDialDigitDelay(0, 0)).toBeCloseTo(0.85 + 0.45, 10);
    expect(authorDialDigitDelay(0, 1)).toBeCloseTo(0.85 + 0.45 + 0.08, 10);
    expect(authorDialDigitDelay(1, 0)).toBeCloseTo(0.88 + 0.45, 10);
  });
});
