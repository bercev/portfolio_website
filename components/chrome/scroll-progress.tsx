"use client";

import {
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useState } from "react";

import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
  type EffectProfile,
} from "@/lib/effect-policy";

export function ScrollProgress() {
  const [mode, setMode] = useState<EffectProfile["mode"]>("static");
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.3,
  });
  const signalTop = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", "calc(100% - 0.75rem)"],
  );

  useEffect(() => {
    const finePointer = window.matchMedia(FINE_POINTER_QUERY);
    const mobile = window.matchMedia(MOBILE_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

    const updateMode = () => {
      setMode(
        getEffectProfile({
          finePointer: finePointer.matches,
          mobile: mobile.matches,
          reducedMotion: reducedMotion.matches,
        }).mode,
      );
    };

    updateMode();
    finePointer.addEventListener("change", updateMode);
    mobile.addEventListener("change", updateMode);
    reducedMotion.addEventListener("change", updateMode);

    return () => {
      finePointer.removeEventListener("change", updateMode);
      mobile.removeEventListener("change", updateMode);
      reducedMotion.removeEventListener("change", updateMode);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-signal-spine
      data-signal-mode={mode}
      className="signal-spine pointer-events-none fixed inset-y-0 right-0 z-[var(--z-site-navigation)]"
    >
      <span data-signal-rail />
      {mode === "static" ? (
        <span data-signal-static />
      ) : (
        <>
          <motion.span
            data-signal-fill
            style={{ scaleY, transformOrigin: "top" }}
          />
          <motion.span data-signal-head style={{ top: signalTop }} />
          <span data-signal-echo="leading" />
          <span data-signal-echo="trailing" />
        </>
      )}
    </div>
  );
}
