import { describe, expect, it } from "vitest";
import { getEffectProfile, shouldMountAcidSquares } from "./effect-policy";

describe("getEffectProfile", () => {
  it("returns the static profile when reduced motion is requested", () => {
    expect(
      getEffectProfile({
        reducedMotion: true,
        finePointer: true,
        mobile: false,
      }),
    ).toEqual({
      mode: "static",
      pointerEffects: false,
      particleCount: 0,
    });
  });

  it("returns the mobile profile for a coarse mobile pointer", () => {
    expect(
      getEffectProfile({
        reducedMotion: false,
        finePointer: false,
        mobile: true,
      }),
    ).toEqual({
      mode: "mobile",
      pointerEffects: false,
      particleCount: 18,
    });
  });

  it("returns the enhanced profile for a fine desktop pointer", () => {
    expect(
      getEffectProfile({
        reducedMotion: false,
        finePointer: true,
        mobile: false,
      }),
    ).toEqual({
      mode: "enhanced",
      pointerEffects: true,
      particleCount: 42,
    });
  });
});

describe("shouldMountAcidSquares", () => {
  it("does not mount Acid Squares when the enhanced journey is active", () => {
    expect(
      shouldMountAcidSquares({ mode: "enhanced", journey: "active" }),
    ).toBe(false);
  });

  it("mounts Acid Squares in the static reduced-motion profile", () => {
    expect(shouldMountAcidSquares({ mode: "static", journey: null })).toBe(
      true,
    );
  });

  it("allows Acid Squares when the journey is inactive", () => {
    expect(
      shouldMountAcidSquares({
        mode: "enhanced",
        journey: null,
        journeyClaimed: true,
      }),
    ).toBe(true);
    expect(
      shouldMountAcidSquares({
        mode: "mobile",
        journey: null,
        journeyClaimed: true,
      }),
    ).toBe(true);
  });

  it("does not mount Acid Squares while the journey is pending", () => {
    expect(
      shouldMountAcidSquares({ mode: "enhanced", journey: "pending" }),
    ).toBe(false);
  });

  it("does not mount Acid Squares on enhanced before the journey claims the background", () => {
    expect(
      shouldMountAcidSquares({
        mode: "enhanced",
        journey: null,
        journeyClaimed: false,
      }),
    ).toBe(false);
  });
});
