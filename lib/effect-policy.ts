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
