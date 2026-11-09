"use client";

import { useEffect, useRef, useState } from "react";

import { ParticleTextScene, type LetterBounds } from "./particle-text-scene";

// BERAT as a live particle sculpture — the GATHER technique (reel 10):
// the word is sampled into a point cloud that assembles from a scatter on
// load, drifts in a slow idle sway, and bursts away from the pointer.
// Same box geometry as the old ASCIIText root (min(100%, 68rem) ×
// clamp(13rem, 32vw, 24rem), centered) so the hero layout does not move;
// only the wordmark itself changes. Reduced-motion visitors never see this
// component — hero.tsx keeps the ASCIIText BERAT for them.
//
// Run 9 (RUN9-HERO-SETTLED-BOLDER): once the assembly lands, a drawn
// measurement frame appears around the settled wordmark — dimension lines
// flanking the letterforms, a baseline rule, and a FIG. 00 caption — so the
// settled hero reads at a glance as a measured drawing plate, not a texture
// swap of the ASCII wordmark. The frame hugs the scene's real letterform
// bounds (not the box), draws in on the settled signal, and stays put
// through pointer bursts and resize re-assemblies.
const COLORS = ["#ffffff", "#00e5ff", "#0090ff"] as const;
const FONT_FAMILY =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
// Dimension lines sit this far outside the letterforms; end ticks are
// this long; the baseline rule sits this far below the letters.
const DIM_OFFSET = 12;
const TICK_HALF = 6;
const RULE_OFFSET = 12;
const CAPTION_OFFSET = 24;

export function ParticleBerat() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [settled, setSettled] = useState(false);
  const [bounds, setBounds] = useState<LetterBounds | null>(null);

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
        onSettled: () => setSettled(true),
      });
      scene.start();
      setBounds(scene.getLetterBounds());
    } catch {
      // WebGL unavailable (or scene boot failed): fall back to plain text
      // rather than an empty band. The word stays readable, no throw.
      setFailed(true);
      return undefined;
    }
    // Rebuild the point cloud when the box resizes (rotation, rail changes).
    const observer = new ResizeObserver(() => {
      scene?.resize();
      setBounds(scene?.getLetterBounds() ?? null);
    });
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
      {bounds ? (
        <div
          data-hero-measure-frame
          data-settled={settled ? "true" : "false"}
          aria-hidden="true"
          className="hero-measure-frame"
        >
          <svg width="100%" height="100%">
            {/* Left dimension line + end ticks. */}
            <line
              x1={bounds.left - DIM_OFFSET}
              y1={bounds.top}
              x2={bounds.left - DIM_OFFSET}
              y2={bounds.bottom}
              pathLength={1}
              className="hero-measure-draw"
            />
            <line
              x1={bounds.left - DIM_OFFSET - TICK_HALF}
              y1={bounds.top}
              x2={bounds.left - DIM_OFFSET + TICK_HALF}
              y2={bounds.top}
              pathLength={1}
              className="hero-measure-draw"
            />
            <line
              x1={bounds.left - DIM_OFFSET - TICK_HALF}
              y1={bounds.bottom}
              x2={bounds.left - DIM_OFFSET + TICK_HALF}
              y2={bounds.bottom}
              pathLength={1}
              className="hero-measure-draw"
            />
            {/* Right dimension line + end ticks. */}
            <line
              x1={bounds.right + DIM_OFFSET}
              y1={bounds.top}
              x2={bounds.right + DIM_OFFSET}
              y2={bounds.bottom}
              pathLength={1}
              className="hero-measure-draw"
            />
            <line
              x1={bounds.right + DIM_OFFSET - TICK_HALF}
              y1={bounds.top}
              x2={bounds.right + DIM_OFFSET + TICK_HALF}
              y2={bounds.top}
              pathLength={1}
              className="hero-measure-draw"
            />
            <line
              x1={bounds.right + DIM_OFFSET - TICK_HALF}
              y1={bounds.bottom}
              x2={bounds.right + DIM_OFFSET + TICK_HALF}
              y2={bounds.bottom}
              pathLength={1}
              className="hero-measure-draw"
            />
            {/* Baseline rule + center tick. */}
            <line
              x1={bounds.left}
              y1={bounds.bottom + RULE_OFFSET}
              x2={bounds.right}
              y2={bounds.bottom + RULE_OFFSET}
              pathLength={1}
              className="hero-measure-draw hero-measure-baseline"
            />
            <line
              x1={(bounds.left + bounds.right) / 2}
              y1={bounds.bottom + RULE_OFFSET - TICK_HALF}
              x2={(bounds.left + bounds.right) / 2}
              y2={bounds.bottom + RULE_OFFSET + TICK_HALF}
              pathLength={1}
              className="hero-measure-draw hero-measure-baseline"
            />
          </svg>
          <div
            data-hero-measure-caption
            className="hero-measure-caption"
            style={{ top: bounds.bottom + CAPTION_OFFSET }}
          >
            <span className="hero-measure-caption-full">
              FIG. 00 — BERAT · PARTICLE FIELD · SCALE 1:1
            </span>
            <span className="hero-measure-caption-short">
              FIG. 00 — BERAT · SCALE 1:1
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
