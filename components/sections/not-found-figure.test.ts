import { describe, expect, it } from "vitest";

import {
  NOT_FOUND_GHOST_DIM_DELAY_S,
  NOT_FOUND_GHOST_DRAW_MS,
  NOT_FOUND_GHOST_STAMP_DELAY_S,
  NOT_FOUND_GHOST_STAMP_PRESS_MS,
  ghostFigureDrawDelay,
} from "./not-found-figure";

describe("ghostFigureDrawDelay", () => {
  it("draws the diagonals first", () => {
    expect(ghostFigureDrawDelay("diagonal")).toBe(0.1);
  });

  it("draws the dimension lines mid-draw", () => {
    expect(ghostFigureDrawDelay("dimension")).toBe(
      NOT_FOUND_GHOST_DIM_DELAY_S,
    );
    expect(NOT_FOUND_GHOST_DIM_DELAY_S).toBeGreaterThan(0.1);
  });

  it("presses the stamp in last, after the draw", () => {
    expect(ghostFigureDrawDelay("stamp")).toBe(NOT_FOUND_GHOST_STAMP_DELAY_S);
    expect(NOT_FOUND_GHOST_STAMP_DELAY_S).toBeGreaterThan(
      NOT_FOUND_GHOST_DIM_DELAY_S,
    );
  });

  it("keeps the draw under a second and the press on the family timing", () => {
    expect(NOT_FOUND_GHOST_DRAW_MS).toBeLessThanOrEqual(1000);
    expect(NOT_FOUND_GHOST_STAMP_PRESS_MS).toBe(220);
  });
});
