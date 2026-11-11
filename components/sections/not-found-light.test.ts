import { describe, expect, it } from "vitest";

import {
  NOT_FOUND_LIGHT_BEAM_DELAY_S,
  NOT_FOUND_LIGHT_BEAM_MS,
  NOT_FOUND_LIGHT_CHIP_DELAY_S,
  NOT_FOUND_LIGHT_CHIP_PRESS_MS,
  NOT_FOUND_LIGHT_ORB_CYCLE_S,
  NOT_FOUND_LIGHT_ORB_X_PX,
  NOT_FOUND_LIGHT_ORB_Y_PX,
  notFoundLightDelay,
} from "./not-found-light";
import { notFoundLightCaption } from "@/lib/plate-labels";

describe("notFoundLightCaption", () => {
  it("is a quiet label for the field — no dimension figures", () => {
    expect(notFoundLightCaption()).toBe("Empty field");
  });
});

describe("notFoundLightDelay", () => {
  it("draws the beam first, then presses the chip in last", () => {
    expect(notFoundLightDelay("beam")).toBe(NOT_FOUND_LIGHT_BEAM_DELAY_S);
    expect(notFoundLightDelay("chip")).toBe(NOT_FOUND_LIGHT_CHIP_DELAY_S);
    expect(NOT_FOUND_LIGHT_CHIP_DELAY_S).toBeGreaterThan(
      NOT_FOUND_LIGHT_BEAM_DELAY_S,
    );
  });

  it("keeps the beam draw under a second and the press on the family timing", () => {
    expect(NOT_FOUND_LIGHT_BEAM_MS).toBeLessThanOrEqual(1000);
    expect(NOT_FOUND_LIGHT_CHIP_PRESS_MS).toBe(220);
  });

  it("keeps the orb drift slow and calm, but far enough to see", () => {
    expect(NOT_FOUND_LIGHT_ORB_CYCLE_S).toBeGreaterThanOrEqual(5);
    expect(NOT_FOUND_LIGHT_ORB_X_PX).toBeGreaterThanOrEqual(20);
    expect(NOT_FOUND_LIGHT_ORB_Y_PX).toBeGreaterThanOrEqual(10);
  });
});
