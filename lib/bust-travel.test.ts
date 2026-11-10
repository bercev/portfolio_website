import { describe, expect, it } from "vitest";

import {
  BUST_STREAM_CLEARANCE_PX,
  BUST_STREAM_MIN_OPACITY,
  BUST_TRAVEL_CONTACT_INDEX,
  bustParked,
  bustTravelOpacity,
  getBustTravelBox,
  setBustTravelBox,
  streamGlyphHiddenByBust,
  type BustTravelBox,
} from "./bust-travel";

const BRIGHT_BOX: BustTravelBox = {
  x: 1068,
  y: 250,
  width: 300,
  height: 300,
  opacity: 0.65,
};

describe("bustParked", () => {
  it("shows the bust at hero (0) and contact (6)", () => {
    expect(bustParked(0)).toBe(false);
    expect(bustParked(BUST_TRAVEL_CONTACT_INDEX)).toBe(false);
  });

  it("parks the bust for every chapter between hero and contact", () => {
    for (let i = 1; i < BUST_TRAVEL_CONTACT_INDEX; i++) {
      expect(bustParked(i)).toBe(true);
    }
  });

  it("never parks on an out-of-range chapter", () => {
    expect(bustParked(-1)).toBe(false);
    expect(bustParked(BUST_TRAVEL_CONTACT_INDEX + 1)).toBe(false);
  });
});

describe("bustTravelOpacity", () => {
  it("is bright unparked and unyielded", () => {
    expect(bustTravelOpacity(false, false)).toBe(0.65);
  });

  it("is a faint ghost unparked and yielded", () => {
    expect(bustTravelOpacity(true, false)).toBe(0.12);
  });

  it("is gone parked, yielded or not", () => {
    expect(bustTravelOpacity(false, true)).toBe(0);
    expect(bustTravelOpacity(true, true)).toBe(0);
  });
});

describe("streamGlyphHiddenByBust", () => {
  it("never hides without a bust", () => {
    expect(streamGlyphHiddenByBust(1200, 400, null)).toBe(false);
  });

  it("never hides under the faint yielded ghost", () => {
    const ghost = { ...BRIGHT_BOX, opacity: 0.12 };
    expect(streamGlyphHiddenByBust(1200, 400, ghost)).toBe(false);
  });

  it("hides at the gate opacity", () => {
    const gate = { ...BRIGHT_BOX, opacity: BUST_STREAM_MIN_OPACITY };
    expect(streamGlyphHiddenByBust(1200, 400, gate)).toBe(true);
  });

  it("hides glyph centers inside the bright box", () => {
    expect(streamGlyphHiddenByBust(1068, 250, BRIGHT_BOX)).toBe(true);
    expect(streamGlyphHiddenByBust(1368, 550, BRIGHT_BOX)).toBe(true);
    expect(streamGlyphHiddenByBust(1218, 400, BRIGHT_BOX)).toBe(true);
  });

  it("hides glyph centers inside the clearance ring", () => {
    expect(
      streamGlyphHiddenByBust(
        BRIGHT_BOX.x - BUST_STREAM_CLEARANCE_PX + 1,
        400,
        BRIGHT_BOX,
      ),
    ).toBe(true);
    expect(
      streamGlyphHiddenByBust(
        BRIGHT_BOX.x + BRIGHT_BOX.width + BUST_STREAM_CLEARANCE_PX - 1,
        400,
        BRIGHT_BOX,
      ),
    ).toBe(true);
  });

  it("lets glyph centers past the clearance through", () => {
    expect(
      streamGlyphHiddenByBust(
        BRIGHT_BOX.x - BUST_STREAM_CLEARANCE_PX - 1,
        400,
        BRIGHT_BOX,
      ),
    ).toBe(false);
    expect(
      streamGlyphHiddenByBust(
        BRIGHT_BOX.x + BRIGHT_BOX.width + BUST_STREAM_CLEARANCE_PX + 1,
        400,
        BRIGHT_BOX,
      ),
    ).toBe(false);
    expect(streamGlyphHiddenByBust(1200, 100, BRIGHT_BOX)).toBe(false);
    expect(streamGlyphHiddenByBust(1200, 700, BRIGHT_BOX)).toBe(false);
  });

  it("never hides for a degenerate box", () => {
    expect(
      streamGlyphHiddenByBust(1200, 400, { ...BRIGHT_BOX, width: 0 }),
    ).toBe(false);
  });
});

describe("bust travel box holder", () => {
  it("round-trips a box and clears to null", () => {
    setBustTravelBox(BRIGHT_BOX);
    expect(getBustTravelBox()).toEqual(BRIGHT_BOX);
    setBustTravelBox(null);
    expect(getBustTravelBox()).toBeNull();
  });
});
