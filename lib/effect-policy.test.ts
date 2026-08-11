import { describe, expect, it } from "vitest";
import { getEffectProfile } from "./effect-policy";

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
