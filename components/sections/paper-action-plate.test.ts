import { describe, expect, it } from "vitest";

import {
  PAPER_ACTION_PRESS_MS,
  PAPER_ACTION_PRESS_SCALE,
  PAPER_ACTION_RULE_MS,
  paperActionDrawDelay,
  paperActionNumber,
} from "./paper-action-plate";

describe("paperActionNumber", () => {
  it("numbers the plates 1-based and zero-padded", () => {
    expect(paperActionNumber(0)).toBe("01");
    expect(paperActionNumber(1)).toBe("02");
  });
});

describe("paperActionDrawDelay", () => {
  it("staggers the plates 45ms apart after a 0.1s entry beat", () => {
    expect(paperActionDrawDelay(0)).toBeCloseTo(0.1, 10);
    expect(paperActionDrawDelay(1)).toBeCloseTo(0.145, 10);
  });
});

describe("PAPER_ACTION_PRESS_MS", () => {
  it("matches the REV-letter / field-note numeral press timing", () => {
    expect(PAPER_ACTION_PRESS_MS).toBe(220);
  });
});

describe("PAPER_ACTION_RULE_MS", () => {
  it("matches the fold-tab / Elsewhere rule-draw timing", () => {
    expect(PAPER_ACTION_RULE_MS).toBe(500);
  });
});

describe("PAPER_ACTION_PRESS_SCALE", () => {
  it("is the reel-4 press scale", () => {
    expect(PAPER_ACTION_PRESS_SCALE).toBe(0.97);
  });
});
