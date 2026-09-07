export type EffectCapabilities = {
  reducedMotion: boolean;
  finePointer: boolean;
  mobile: boolean;
};

export type EffectProfile = {
  mode: "static" | "mobile" | "enhanced";
  pointerEffects: boolean;
  particleCount: number;
};

export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
export const MOBILE_QUERY = "(max-width: 767px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function getEffectProfile(
  capabilities: EffectCapabilities,
): EffectProfile {
  if (capabilities.reducedMotion) {
    return { mode: "static", pointerEffects: false, particleCount: 0 };
  }

  if (capabilities.mobile || !capabilities.finePointer) {
    return { mode: "mobile", pointerEffects: false, particleCount: 18 };
  }

  return { mode: "enhanced", pointerEffects: true, particleCount: 42 };
}

/** Journey WebGL occupies the full-viewport background in these states. */
export function isJourneyBackgroundActive(
  journey: string | null | undefined,
): boolean {
  return journey === "active" || journey === "pending";
}

/**
 * Acid Squares is the fallback caustic: reduced-motion / journey-off.
 * Never stack it with a running journey WebGL scene.
 *
 * `journeyClaimed` is true after html has shown `data-journey="pending"` or
 * `"active"`. Enhanced/mobile wait for that so Acid Squares does not boot
 * during the frame before Journey claims the background.
 */
export function shouldMountAcidSquares({
  mode,
  journey,
  journeyClaimed = false,
}: {
  mode: EffectProfile["mode"];
  journey: string | null | undefined;
  journeyClaimed?: boolean;
}): boolean {
  if (isJourneyBackgroundActive(journey)) return false;
  if (mode === "static") return true;
  return journeyClaimed;
}
