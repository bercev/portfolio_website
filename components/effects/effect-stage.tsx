"use client";

import { useEffect, useState } from "react";

import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
  isJourneyBackgroundActive,
  type EffectProfile,
} from "@/lib/effect-policy";

import { ShaderBackdrop } from "./shader-backdrop";
import { SpecularControls } from "./specular-controls";
import { BootSequence } from "./boot-sequence";
import { EasterEggs } from "./easter-eggs";
import { AsciiPerson3D } from "./ascii-person-3d";

export function EffectStage() {
  const [profile, setProfile] = useState<EffectProfile | null>(null);
  const [journey, setJourney] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const syncJourney = () => {
      setJourney(root.getAttribute("data-journey"));
    };

    syncJourney();
    const observer = new MutationObserver(syncJourney);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-journey"],
    });
    return () => observer.disconnect();
  }, []);

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

  const mode = profile?.mode ?? "static";
  // The shader backdrop is the primary background in every profile. When the
  // Journey geometry background is active (see app/page.tsx fallback flag),
  // it owns the background instead — never stack the two WebGL scenes.
  const showShaderBackdrop =
    profile !== null && !isJourneyBackgroundActive(journey);

  return (
    <>
      <BootSequence />
      <EasterEggs />
      <AsciiPerson3D />
      <div
        aria-hidden="true"
        className="pointer-events-none"
        data-effect-mode={mode}
        style={{ position: "fixed", inset: 0, zIndex: 1 }}
      >
      {showShaderBackdrop ? <ShaderBackdrop profile={profile} /> : null}
      {profile?.pointerEffects ? (
        <>
          <SpecularControls />
        </>
      ) : null}
      </div>
    </>
  );
}
