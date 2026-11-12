"use client";

import { useEffect, useRef } from "react";

import { METABALL_REST_T, metaballPositions } from "@/lib/hero-metaballs";

// Hero metaballs (RUN10-METABALLS, reel 7) — 2–3 soft FROST-cyan light
// orbs that drift, merge, and split behind the particle BERAT. Canvas2D
// radial gradients composited additively ("lighter"), so wherever two
// blobs overlap the light brightens into one — the merge reads without
// any gooey filter or new dependency. No cursor interaction by design
// (the site never follows the cursor); the blobs wander on their own
// Lissajous paths (lib/hero-metaballs.ts, deterministic and unit-tested).
//
// The canvas fills its parent: hero.tsx mounts it in a layer sized
// exactly like the BERAT box and anchored to the band's bottom edge, so
// it sits behind the wordmark in both modes. Reduced motion draws one
// static frame at METABALL_REST_T (a split pose — all three blobs
// distinct) and never loops. The loop also pauses its draws while the
// hero is off-screen or the tab is hidden.

function hexA(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HeroMetaballs({ reduceMotion }: { reduceMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let raf = 0;
    let disposed = false;
    let inView = true;

    const draw = (t: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const blobs = metaballPositions(t, w, h);
      for (const b of blobs) {
        // Wide soft halo with a FLAT TOP (fix2): the disc holds near-full
        // alpha out to 0.65r, so the blob reads as a round body — not just
        // a glow — even where bright particle letters cross it, and the
        // halo peeks above/below the letter band where the merge shows.
        // A pure falloff gradient vanished behind the letters in dark
        // theme (mobile critic, fix run).
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, hexA(b.color, b.alpha));
        g.addColorStop(0.65, hexA(b.color, b.alpha * 0.85));
        g.addColorStop(0.88, hexA(b.color, b.alpha * 0.3));
        g.addColorStop(1, hexA(b.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        // Compact bright heart (run-7 flare lesson: a sharp core over a
        // blurred glow is what the eye tracks). Two hearts fusing into
        // one is the visible merge; the heart is small enough that no
        // letter is ever washed by it.
        const coreR = b.r * 0.34;
        const c = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, coreR);
        c.addColorStop(0, "rgba(232, 251, 255, 0.55)");
        c.addColorStop(0.6, hexA(b.color, 0.3));
        c.addColorStop(1, hexA(b.color, 0));
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(b.x, b.y, coreR, 0, Math.PI * 2);
        ctx.fill();
      }
      // Probe surface for the verification scripts: blob centers + mode.
      canvas.dataset.centers = JSON.stringify(
        blobs.map((b) => [Math.round(b.x), Math.round(b.y)]),
      );
      canvas.dataset.t = t.toFixed(2);
      canvas.dataset.mode = reduceMotion ? "static" : "motion";
    };

    if (reduceMotion) {
      draw(METABALL_REST_T);
      const onResize = () => draw(METABALL_REST_T);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    });
    observer.observe(canvas);
    const start = performance.now();
    const loop = (now: number) => {
      if (disposed) return;
      if (inView && !document.hidden) draw((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      data-hero-metaballs
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
      }}
    />
  );
}
