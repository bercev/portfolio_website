"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { usePalette } from "@/components/providers/palette-provider";
import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
  type EffectProfile,
} from "@/lib/effect-policy";

import {
  JourneyScene,
  type JourneyPalette,
  type JourneyQuality,
} from "./journey-scene";

const STATIC_PROFILE: EffectProfile = {
  mode: "static",
  pointerEffects: false,
  particleCount: 0,
};

const ACCENT_TOKEN = "--hero-particle-accent";
const COLOR_TOKENS = [
  "--hero-particle-accent",
  "--hero-particle-cyan",
  "--hero-particle-emerald",
  "--effect-chroma-amber",
  "--hero-particle-coral",
] as const;

function readTokenColor(root: HTMLElement, token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  probe.style.display = "none";
  root.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

export function Journey({
  stationCounts,
}: {
  /** Orbit dust count per station — mirrors portfolio content. */
  readonly stationCounts: readonly number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const { palette } = usePalette();
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (profile.mode === "static" || !canvas) return;

    let scene: JourneyScene | null = null;
    let disposed = false;
    const root = document.documentElement;

    const setup = async () => {
      try {
        await document.fonts.ready;
        if (disposed) return;

        const styleRoot = canvas;

        const colors: JourneyPalette = {
          accent: readTokenColor(styleRoot, ACCENT_TOKEN),
          cyan: readTokenColor(styleRoot, COLOR_TOKENS[1]),
          emerald: readTokenColor(styleRoot, COLOR_TOKENS[2]),
          amber: readTokenColor(styleRoot, COLOR_TOKENS[3]),
          coral: readTokenColor(styleRoot, COLOR_TOKENS[4]),
        };

        const spaceBg = readTokenColor(styleRoot, "--journey-space-bg");
        const fog = readTokenColor(styleRoot, "--journey-space-fog");

        scene = new JourneyScene({
          canvas,
          quality: (profile.mode === "mobile" ? "mobile" : "full") as JourneyQuality,
          reducedMotion: false,
          spaceBg,
          fog,
          palette: colors,
          stationCounts,
          onProgress: (t) => {
            const rail = railFillRef.current;
            if (rail) rail.style.transform = `scaleY(${t})`;
          },
        });

        root.dataset.journey = "active";
      } catch {
        scene?.dispose();
        scene = null;
        delete root.dataset.journey;
      }
    };

    void setup();

    return () => {
      disposed = true;
      scene?.dispose();
      if (root.dataset.journey === "active") delete root.dataset.journey;
    };
  }, [profile, palette, resolvedTheme, stationCounts]);

  return (
    <>
      <canvas
        key={`${resolvedTheme}-${palette}`}
        ref={canvasRef}
        aria-hidden="true"
        className="journey-scene"
        data-journey-scene
      />
      <div aria-hidden="true" className="journey-vignette" />
      <div aria-hidden="true" className="journey-rail">
        <div ref={railFillRef} className="journey-rail-fill" />
      </div>
    </>
  );
}