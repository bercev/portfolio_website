"use client";

import { useEffect, useState } from "react";

import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
  type EffectProfile,
} from "@/lib/effect-policy";

import { ClickSpark } from "./click-spark";
import { AcidSquares } from "./acid-squares";
import { SpecularControls } from "./specular-controls";
import { TargetCursor } from "./target-cursor";

const STATIC_PROFILE: EffectProfile = {
  mode: "static",
  pointerEffects: false,
  particleCount: 0,
};

export function EffectStage() {
  const [profile, setProfile] = useState<EffectProfile>(STATIC_PROFILE);

  useEffect(() => {
    const finePointer = window.matchMedia(FINE_POINTER_QUERY);
    const mobile = window.matchMedia(MOBILE_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

    const updateProfile = () => {
      setProfile(
        getEffectProfile({
          finePointer: finePointer.matches,
          mobile: mobile.matches,
          reducedMotion: reducedMotion.matches,
        }),
      );
    };

    updateProfile();
    finePointer.addEventListener("change", updateProfile);
    mobile.addEventListener("change", updateProfile);
    reducedMotion.addEventListener("change", updateProfile);

    return () => {
      finePointer.removeEventListener("change", updateProfile);
      mobile.removeEventListener("change", updateProfile);
      reducedMotion.removeEventListener("change", updateProfile);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none"
      data-effect-mode={profile.mode}
    >
      <AcidSquares profile={profile} />
      {profile.pointerEffects ? (
        <>
          <SpecularControls />
          <TargetCursor
            cursorColor="var(--effect-cursor)"
            cursorColorOnTarget="var(--effect-cursor)"
          />
          <ClickSpark />
        </>
      ) : null}
    </div>
  );
}
