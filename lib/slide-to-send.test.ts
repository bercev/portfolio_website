import { describe, expect, it } from "vitest";

import {
  SLIDE_TO_SEND_FLICK_VELOCITY_PX_S,
  SLIDE_TO_SEND_THRESHOLD,
  slideToSendHomeTransition,
  slideToSendKeyStepPx,
  slideToSendLabelOpacity,
  slideToSendShouldCommit,
  slideToSendThumbWidth,
  slideToSendTravel,
  slideToSendVelocity,
} from "./slide-to-send";

describe("slide-to-send travel", () => {
  it("measures travel from the live track width minus pad and thumb", () => {
    // 570px desktop form track, 48px thumb, 4px pad each side.
    expect(slideToSendTravel(570, 48)).toBe(514);
    // 306px mobile track.
    expect(slideToSendTravel(306, 48)).toBe(250);
  });

  it("never reports a zero or negative travel", () => {
    expect(slideToSendTravel(40, 48)).toBe(1);
  });

  it("sizes the thumb from the track height", () => {
    expect(slideToSendThumbWidth()).toBe(48);
  });

  it("steps arrow keys by a tenth of travel", () => {
    expect(slideToSendKeyStepPx(514)).toBeCloseTo(51.4, 1);
  });
});

describe("slide-to-send release decision", () => {
  const travel = 514;

  it("commits at full travel whatever the velocity", () => {
    expect(slideToSendShouldCommit(travel, travel, 0)).toBe(true);
    expect(slideToSendShouldCommit(travel, travel, -500)).toBe(true);
  });

  it("commits past the threshold on a fast flick", () => {
    expect(
      slideToSendShouldCommit(
        SLIDE_TO_SEND_THRESHOLD * travel,
        travel,
        SLIDE_TO_SEND_FLICK_VELOCITY_PX_S,
      ),
    ).toBe(true);
    expect(slideToSendShouldCommit(0.95 * travel, travel, 2400)).toBe(true);
  });

  it("springs home past the threshold on a slow release", () => {
    expect(slideToSendShouldCommit(0.95 * travel, travel, 300)).toBe(false);
    expect(
      slideToSendShouldCommit(
        0.95 * travel,
        travel,
        SLIDE_TO_SEND_FLICK_VELOCITY_PX_S - 1,
      ),
    ).toBe(false);
  });

  it("springs home below the threshold even on a fast flick", () => {
    expect(slideToSendShouldCommit(0.5 * travel, travel, 3000)).toBe(false);
    expect(slideToSendShouldCommit(0.89 * travel, travel, 3000)).toBe(false);
  });
});

describe("slide-to-send velocity", () => {
  it("reads px/s from the first-to-last sample", () => {
    expect(
      slideToSendVelocity([
        [0, 0],
        [100, 120],
      ]),
    ).toBe(1200);
    expect(slideToSendVelocity([[0, 100]])).toBe(0);
    expect(slideToSendVelocity([])).toBe(0);
  });

  it("keeps the sign for a backwards drag", () => {
    expect(
      slideToSendVelocity([
        [0, 200],
        [200, 100],
      ]),
    ).toBe(-500);
  });
});

describe("slide-to-send label fade", () => {
  it("is fully visible at rest and gone by 55% of travel", () => {
    expect(slideToSendLabelOpacity(0, 514)).toBe(1);
    expect(slideToSendLabelOpacity(0.55 * 514, 514)).toBe(0);
    expect(slideToSendLabelOpacity(514, 514)).toBe(0);
  });

  it("fades linearly across the first 55%", () => {
    expect(slideToSendLabelOpacity(0.275 * 514, 514)).toBeCloseTo(0.5, 2);
  });
});

describe("slide-to-send home transition", () => {
  it("springs home in full motion and eases out under reduced motion", () => {
    const spring = slideToSendHomeTransition(false);
    expect(spring.type).toBe("spring");
    const reduced = slideToSendHomeTransition(true);
    expect(reduced.duration).toBe(0.2);
    expect(reduced.type).toBeUndefined();
  });
});
