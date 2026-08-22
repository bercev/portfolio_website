"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
} from "@/lib/effect-policy";
import { usePalette } from "@/components/providers/palette-provider";
import { cn } from "@/lib/utils";

import { ParticleTextScene } from "./particle-text-scene";

type ParticleTextMode = "enhanced" | "static";

const COLOR_TOKENS = [
  "--portfolio-accent",
  "--effect-chroma-cyan",
  "--effect-chroma-emerald",
  "--effect-chroma-coral",
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

export function HeroParticleText({
  className,
  text,
}: {
  className?: string;
  text: string;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<ParticleTextMode>("static");
  const { resolvedTheme } = useTheme();
  const { palette } = usePalette();
  const displayText = text.toUpperCase();

  useEffect(() => {
    const finePointer = window.matchMedia(FINE_POINTER_QUERY);
    const mobile = window.matchMedia(MOBILE_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

    const updateMode = () => {
      const profile = getEffectProfile({
        finePointer: finePointer.matches,
        mobile: mobile.matches,
        reducedMotion: reducedMotion.matches,
      });
      setMode(profile.mode === "enhanced" ? "enhanced" : "static");
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

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (mode !== "enhanced" || !root || !canvas) return;

    let scene: ParticleTextScene | null = null;
    let disposed = false;

    const setup = async () => {
      try {
        await document.fonts.ready;
        if (disposed) return;

        const styles = getComputedStyle(root);
        scene = new ParticleTextScene({
          canvas,
          colors: COLOR_TOKENS.map((token) => readTokenColor(root, token)),
          fontFamily: styles.fontFamily,
          text: displayText,
        });
        scene.start();
      } catch {
        scene?.dispose();
        scene = null;
        if (!disposed) setMode("static");
      }
    };

    const resizeObserver = new ResizeObserver(() => scene?.resize());
    resizeObserver.observe(root);
    void setup();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      scene?.dispose();
    };
  }, [displayText, mode, palette, resolvedTheme]);

  return (
    <span
      ref={rootRef}
      className={cn(
        "relative isolate mx-auto block h-[clamp(13rem,32vw,24rem)] w-full max-w-[68rem] overflow-hidden font-sans max-md:h-[clamp(11rem,52vw,14rem)]",
        className,
      )}
      data-hero-particle-text
      data-particle-text-mode={mode}
    >
      {mode === "enhanced" ? (
        <>
          <span className="sr-only">{displayText}</span>
          <canvas
            key={`${resolvedTheme}-${palette}`}
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 size-full touch-none"
          />
        </>
      ) : (
        <span className="grid size-full place-items-center text-[clamp(4.5rem,18vw,12rem)] font-extrabold leading-[0.8] tracking-[-0.075em] text-portfolio-accent">
          {displayText}
        </span>
      )}
    </span>
  );
}
