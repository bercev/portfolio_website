import { describe, expect, it } from "vitest";

import { noteDrawDelay, noteLabel } from "./about-notes";

describe("noteLabel", () => {
  it("labels the notes 1-based with their total", () => {
    expect(noteLabel(0, 4)).toBe("Note 1 of 4");
    expect(noteLabel(1, 4)).toBe("Note 2 of 4");
    expect(noteLabel(3, 4)).toBe("Note 4 of 4");
  });
});

describe("noteDrawDelay", () => {
  it("starts just after the note enters view, staggered per note", () => {
    expect(noteDrawDelay(0)).toBe(0.1);
    expect(noteDrawDelay(1)).toBeCloseTo(0.13, 10);
    expect(noteDrawDelay(3)).toBeCloseTo(0.19, 10);
  });
});
