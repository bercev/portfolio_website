"use client";

import Lenis from "lenis";
import { useEffect } from "react";

import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";

/**
 * Butter-smooth scroll driving the whole page — including the scroll-scrubbed
 * Journey camera, which reads native scroll position. Disabled entirely under
 * prefers-reduced-motion (the static effect profile).
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
    });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
