"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
} from "@/lib/effect-policy";
import { cn } from "@/lib/utils";

import { AsciiScene } from "./ascii-scene";

export function AsciiText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const sampleCanvas = sampleCanvasRef.current;
    const output = outputRef.current;
    if (!root || !canvas || !sampleCanvas || !output) return;

    const finePointer = window.matchMedia(FINE_POINTER_QUERY);
    const mobile = window.matchMedia(MOBILE_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    let scene: AsciiScene | null = null;
    let generation = 0;
    let disposed = false;

    const setup = async () => {
      const currentGeneration = ++generation;
      scene?.dispose();
      scene = null;
      root.dataset.asciiFallback = "false";
      output.textContent = "";

      await document.fonts.ready;
      if (disposed || currentGeneration !== generation) return;

      const profile = getEffectProfile({
        finePointer: finePointer.matches,
        mobile: mobile.matches,
        reducedMotion: reducedMotion.matches,
      });
      const animated = profile.mode !== "static";
      root.dataset.asciiMode = animated ? "animated" : "static";
      root.dataset.asciiProfile = profile.mode;

      try {
        const nextScene = new AsciiScene({
          root,
          canvas,
          sampleCanvas,
          output,
          text,
          animated,
          interactive: profile.pointerEffects,
          cellSize: profile.mode === "mobile" ? 10 : 8,
        });

        if (disposed || currentGeneration !== generation) {
          nextScene.dispose();
          return;
        }

        scene = nextScene;
        scene.start();
      } catch {
        root.dataset.asciiFallback = "true";
        root.dataset.asciiMode = "static";
      }
    };

    void setup();
    finePointer.addEventListener("change", setup);
    mobile.addEventListener("change", setup);
    reducedMotion.addEventListener("change", setup);

    return () => {
      disposed = true;
      generation += 1;
      finePointer.removeEventListener("change", setup);
      mobile.removeEventListener("change", setup);
      reducedMotion.removeEventListener("change", setup);
      scene?.dispose();
    };
  }, [resolvedTheme, text]);

  return (
    <span className={cn("relative block w-full", className)} data-ascii-text>
      <span className="sr-only">{text}</span>
      <span
        ref={rootRef}
        aria-hidden="true"
        className="ascii-text-root"
        data-ascii-root
        data-ascii-fallback="false"
        data-ascii-mode="static"
      >
        <canvas ref={canvasRef} data-ascii-canvas />
        <canvas ref={sampleCanvasRef} data-ascii-sample />
        <pre ref={outputRef} data-ascii-output />
        <span data-ascii-fallback-text>{text}</span>
      </span>
    </span>
  );
}
