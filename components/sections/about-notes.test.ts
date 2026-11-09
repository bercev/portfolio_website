import { describe, expect, it } from "vitest";

import { noteDrawDelay, noteLabel } from "./about-notes";

describe("noteLabel", () => {
  it("numbers the field notes 1-based and zero-padded", () => {
    expect(noteLabel(0)).toBe("NOTE 01");
    expect(noteLabel(1)).toBe("NOTE 02");
    expect(noteLabel(3)).toBe("NOTE 04");
  });
});

describe("noteDrawDelay", () => {
  it("starts just after the note enters view, staggered per note", () => {
    expect(noteDrawDelay(0)).toBe(0.1);
    expect(noteDrawDelay(1)).toBeCloseTo(0.13, 10);
    expect(noteDrawDelay(3)).toBeCloseTo(0.19, 10);
  });
});
