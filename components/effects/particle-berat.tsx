"use client";

import { useEffect, useRef, useState } from "react";

import { ParticleTextScene } from "./particle-text-scene";

// BERAT as a live particle sculpture — the GATHER technique (reel 10):
// the word is sampled into a point cloud that assembles from a scatter on
// load, drifts in a slow idle sway, and bursts away from the pointer.
// Same box geometry as the old ASCIIText root (min(100%, 68rem) ×
// clamp(13rem, 32vw, 24rem), centered) so the hero layout does not move;
// only the wordmark itself changes. Reduced-motion visitors never see this
// component — hero.tsx keeps the ASCIIText BERAT for them.
const COLORS = ["#ffffff", "#00e5ff", "#0090ff"] as const;
const FONT_FAMILY =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export function ParticleBerat() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let scene: ParticleTextScene | null = null;
    try {
      scene = new ParticleTextScene({
        canvas,
        colors: COLORS,
        fontFamily: FONT_FAMILY,
        text: "BERAT",
        assemble: true,
      });
      scene.start();
    } catch {
      // WebGL unavailable (or scene boot failed): fall back to plain text
      // rather than an empty band. The word stays readable, no throw.
      setFailed(true);
      return undefined;
    }
    // Rebuild the point cloud when the box resizes (rotation, rail changes).
    const observer = new ResizeObserver(() => scene?.resize());
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      scene?.dispose();
    };
  }, []);

  if (failed) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: "min(100%, 68rem)",
          height: "clamp(13rem, 32vw, 24rem)",
          marginInline: "auto",
          display: "grid",
          placeItems: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: 800,
          fontSize: "clamp(4rem, 14vw, 10rem)",
          letterSpacing: "0.07em",
          lineHeight: 1,
          color: "#00e5ff",
        }}
      >
        BERAT
      </div>
    );
  }

  return (
    <div
      data-particle-berat-root
      style={{
        position: "relative",
        width: "min(100%, 68rem)",
        height: "clamp(13rem, 32vw, 24rem)",
        marginInline: "auto",
        // The band is pointer-events:none; the canvas needs the pointer
        // for its repulsion field.
        pointerEvents: "auto",
      }}
    >
      <canvas
        ref={canvasRef}
        data-particle-berat
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
