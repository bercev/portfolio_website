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

const ACCENT_TOKEN = "--accent-neon";
const COLOR_TOKENS = [
  "--accent-neon",
  "--chroma-cyan-neon",
  "--chroma-emerald-neon",
  "--chroma-amber-neon",
  "--chroma-coral-neon",
] as const;

function readTokenColor(root: HTMLElement, token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  probe.style.display = "none";
  root.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return normalizeCssColor(color);
}

/**
 * THREE.Color cannot parse wide-gamut serializations such as
 * `color(srgb 0.5 0.6 0.7)` (what color-mix() tokens compute to),
 * so rescale them into plain rgb().
 */
function normalizeCssColor(value: string): string {
  const srgb = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (!srgb) return value;
  const channel = (raw: string) => Math.round(parseFloat(raw) * 255);
  return `rgb(${channel(srgb[1])}, ${channel(srgb[2])}, ${channel(srgb[3])})`;
}

export function Journey({
  stationCounts,
}: {
  /** Orbit dust count per station — mirrors portfolio content. */
  readonly stationCounts: readonly number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<JourneyScene | null>(null);
  const { resolvedTheme } = useTheme();
  const { palette } = usePalette();
  const [profile, setProfile] = useState<EffectProfile>(STATIC_PROFILE);
  const [pointerLookHot, setPointerLookHot] = useState(false);

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

  // Pointer-look / mouse-moves-camera only on #home and Contact.
  useEffect(() => {
    const home = document.getElementById("home");
    const contact = document.getElementById("contact");
    if (!home && !contact) return;

    const visible = new Set<string>();
    const sync = () => setPointerLookHot(visible.size > 0);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        sync();
      },
      { threshold: 0.2 },
    );
    if (home) observer.observe(home);
    if (contact) observer.observe(contact);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (profile.mode === "static" || !canvas) return;

    let scene: JourneyScene | null = null;
    let disposed = false;
    const root = document.documentElement;
    root.dataset.journey = "pending";

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
          lightTheme: !root.classList.contains("dark"),
        });
        sceneRef.current = scene;
        scene.setPointerLookEnabled(pointerLookHot);

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
      if (sceneRef.current === scene) sceneRef.current = null;
      if (root.dataset.journey === "active" || root.dataset.journey === "pending") {
        delete root.dataset.journey;
      }
    };
    // pointerLookHot applied via the dedicated effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, palette, resolvedTheme, stationCounts]);

  useEffect(() => {
    sceneRef.current?.setPointerLookEnabled(pointerLookHot);
  }, [pointerLookHot]);

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
    </>
  );
}