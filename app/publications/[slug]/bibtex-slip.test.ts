import { describe, expect, it } from "vitest";

import {
  BIBTEX_SLIP_COPY_DELAY_S,
  BIBTEX_SLIP_PRESS_MS,
  BIBTEX_SLIP_PRESS_SCALE,
  BIBTEX_SLIP_RULE_DELAY_S,
  BIBTEX_SLIP_RULE_MS,
  BIBTEX_SLIP_TEAR_MS,
  bibtexSlipCopyLabel,
  bibtexSlipSettle,
} from "@/lib/bibtex-slip";

describe("bibtexSlipSettle", () => {
  it("settles fully opaque, in place, at a slight torn-slip tilt", () => {
    expect(bibtexSlipSettle()).toEqual({ rotate: -0.5, y: 0, opacity: 1 });
  });
});

describe("bibtexSlipCopyLabel", () => {
  it('reads "Copy" at rest and "Copied" after a copy', () => {
    expect(bibtexSlipCopyLabel(false)).toBe("Copy");
    expect(bibtexSlipCopyLabel(true)).toBe("Copied");
  });
});

describe("bibtex slip timing", () => {
  it("tears in under half a second with the rule drawing first", () => {
    expect(BIBTEX_SLIP_TEAR_MS).toBe(450);
    expect(BIBTEX_SLIP_RULE_MS).toBe(500);
    expect(BIBTEX_SLIP_RULE_DELAY_S).toBeLessThan(BIBTEX_SLIP_COPY_DELAY_S);
  });

  it("presses on the fold-tab timing at the reel-4 scale", () => {
    expect(BIBTEX_SLIP_PRESS_MS).toBe(220);
    expect(BIBTEX_SLIP_PRESS_SCALE).toBe(0.97);
  });
});
