"use client";

import { useEffect, useState } from "react";

import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
  isJourneyBackgroundActive,
  shouldMountAcidSquares,
  type EffectProfile,
} from "@/lib/effect-policy";

import { ClickSpark } from "./click-spark";
import { AcidSquares } from "./acid-squares";
import { SpecularControls } from "./specular-controls";
import { TargetCursor } from "./target-cursor";

export function EffectStage() {
  const [profile, setProfile] = useState<EffectProfile | null>(null);
  const [journey, setJourney] = useState<string | null>(null);
  const [journeyClaimed, setJourneyClaimed] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const syncJourney = () => {
      const next = root.getAttribute("data-journey");
      setJourney(next);
      if (isJourneyBackgroundActive(next)) {
        setJourneyClaimed(true);
      }
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
  const showAcidSquares =
    profile !== null &&
    shouldMountAcidSquares({
      mode: profile.mode,
      journey,
      journeyClaimed,
    });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none"
      data-effect-mode={mode}
    >
      {showAcidSquares ? <AcidSquares profile={profile} /> : null}
      {profile?.pointerEffects ? (
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
