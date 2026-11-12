"use client";

import { useEffect, useRef } from "react";

import {
  LASER_BEAM_CORE_PX,
  LASER_BEAM_HALO_PX,
  LASER_BEAM_X,
  LASER_INTRO_DELAY_MS,
  LASER_INTRO_END_MS,
  laserBeamFrontY,
  laserBeamTopY,
  laserBloom,
  laserBreath,
  laserHoverBoost,
  laserPhase,
  laserPourFillAtTau,
  laserPourFrontAtTau,
  laserPourTau,
  laserSettled,
  laserSpillAtTau,
  laserSplash,
  laserTauSeconds,
} from "@/lib/hero-laser";

// Hero CTA laser pour (RUN10-LASER, reel 7 + React Bits Laser Flow) —
// a beam of FROST light falls onto the CTA pill on load, splashes on
// its top edge, and pours over both corners. Rebuilt in our own
// Canvas2D stack from the LaserFlow source (MIT + Commons Clause,
// read in full); no WebGL, no new dependency, no cursor tracking —
// hover only re-runs the pour. The canvas hangs off the pill (CSS:
// 16px side pads, 112px above for the fall, 20px below for the
// corner spill) and paints UNDER the label (z-index 0 vs the label's
// 1), so the light touches the pill's edge, never the text.
//
// Two passes per shape, the same lesson as the foil (iter 38): a
// source-over pass in deeper cyan carries the beam on light
// backgrounds, and an additive ("lighter") pass with a white-hot core
// carries it on dark ones. The settled beam is a short stub above
// the pill (the model drains the column after impact) so it never
// tints the ticker line 14px above the pill.
//
// Timing: the intro clock starts once the boot overlay is gone (the
// boot covers the hero for ~3s on a first desktop visit — a fall
// started at mount would run behind it) and the model's own 1.2s
// delay covers the CTA entrance. The clock is wall-clock
// (performance.now()), never the rAF timestamp — see the iter-31
// rAF-timestamp-lag sign. Reduced motion draws one settled frame and
// never loops. The loop pauses while the hero is off-screen or the
// tab is hidden (metaballs pattern).

const CYAN = "#00e5ff";
const SKY = "#7dd3fc";
const DEEP_CYAN = "#0284c7";
const WHITE_RGB = "232, 251, 255";

function hexA(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function whiteA(alpha: number): string {
  return `rgba(${WHITE_RGB}, ${alpha})`;
}

type PillGeometry = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  radius: number;
  beamX: number;
};

export function HeroLaser({ reduceMotion }: { reduceMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const anchor = canvas.closest("[data-hero-cta]") as HTMLElement | null;
    if (!anchor) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let raf = 0;
    let disposed = false;
    let inView = true;
    const mountTime = performance.now();
    let introStart: number | null = null;
    let hoverStart: number | null = null;

    const geometry = (): PillGeometry | null => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const pillH = anchor.clientHeight;
      if (!w || !h || !pillH) return null;
      const left = 16;
      const right = w - 16;
      const top = h - 20 - pillH;
      return {
        left,
        right,
        top,
        bottom: top + pillH,
        radius: pillH / 2,
        beamX: left + LASER_BEAM_X * (right - left),
      };
    };

    const draw = (tMs: number, hoverTauSeconds: number | null) => {
      const g = geometry();
      if (!g) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const phase = laserPhase(tMs);
      const settled = laserSettled(tMs);
      const introTau = laserTauSeconds(tMs);
      const pourTau = laserPourTau(introTau, hoverTauSeconds);
      const pourSettled = settled && hoverTauSeconds === null;
      const bloom = laserBloom(tMs);
      const breath = laserBreath(tMs);
      const boost =
        hoverTauSeconds === null ? 0 : laserHoverBoost(hoverTauSeconds);
      const splash = Math.max(laserSplash(tMs), 0.7 * boost);

      const reachL = g.beamX - g.left;
      const reachR = g.right - g.beamX;
      const pourL = laserPourFrontAtTau(pourTau, reachL, pourSettled);
      const pourR = laserPourFrontAtTau(pourTau, reachR, pourSettled);
      const fillL = laserPourFillAtTau(pourTau, reachL, pourSettled);
      const fillR = laserPourFillAtTau(pourTau, reachR, pourSettled);
      const spillL = laserSpillAtTau(pourTau, reachL, pourSettled);
      const spillR = laserSpillAtTau(pourTau, reachR, pourSettled);

      // Beam column: a stack of slices so the vertical fade (bright at
      // the head, fading upward) and the horizontal profile are both
      // exact. The column drains after impact, leaving the stub.
      const frontY = laserBeamFrontY(tMs, g.top);
      const topY = laserBeamTopY(tMs, g.top);
      const fadeIn = Math.min(
        1,
        Math.max(0, (tMs - LASER_INTRO_DELAY_MS) / 150),
      );
      const beamAlpha =
        phase === "waiting"
          ? 0
          : phase === "fall"
            ? 0.9 * fadeIn
            : settled
              ? 0.5 + 0.15 * breath + 0.4 * boost
              : 0.8 + 0.1 * breath;
      if (beamAlpha > 0.01 && frontY > topY) {
        const slices = 28;
        const span = frontY - topY;
        for (const [pass, haloA, coreA] of [
          ["base", 0.3, 0.55],
          ["lite", 0.5, 0.9],
        ] as const) {
          ctx.globalCompositeOperation =
            pass === "base" ? "source-over" : "lighter";
          const haloGrad = ctx.createLinearGradient(
            g.beamX - LASER_BEAM_HALO_PX,
            0,
            g.beamX + LASER_BEAM_HALO_PX,
            0,
          );
          const haloColor = pass === "base" ? CYAN : SKY;
          haloGrad.addColorStop(0, hexA(haloColor, 0));
          haloGrad.addColorStop(0.5, hexA(haloColor, haloA));
          haloGrad.addColorStop(1, hexA(haloColor, 0));
          const coreGrad = ctx.createLinearGradient(
            g.beamX - LASER_BEAM_CORE_PX,
            0,
            g.beamX + LASER_BEAM_CORE_PX,
            0,
          );
          if (pass === "base") {
            coreGrad.addColorStop(0, hexA(DEEP_CYAN, 0));
            coreGrad.addColorStop(0.5, hexA(DEEP_CYAN, coreA));
            coreGrad.addColorStop(1, hexA(DEEP_CYAN, 0));
          } else {
            coreGrad.addColorStop(0, whiteA(0));
            coreGrad.addColorStop(0.5, whiteA(coreA));
            coreGrad.addColorStop(1, whiteA(0));
          }
          for (let i = 0; i < slices; i++) {
            const v = i / (slices - 1);
            // Bright at the head (bottom), fading toward the top.
            const sliceAlpha = beamAlpha * (0.15 + 0.85 * v);
            const y0 = topY + (span * i) / slices;
            const sliceH = span / slices + 1;
            ctx.globalAlpha = sliceAlpha;
            ctx.fillStyle = haloGrad;
            ctx.fillRect(
              g.beamX - LASER_BEAM_HALO_PX,
              y0,
              LASER_BEAM_HALO_PX * 2,
              sliceH,
            );
            ctx.fillStyle = coreGrad;
            ctx.fillRect(
              g.beamX - LASER_BEAM_CORE_PX,
              y0,
              LASER_BEAM_CORE_PX * 2,
              sliceH,
            );
          }
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      // Splash flare at the impact point (transient, ~0.6s).
      if (splash > 0.01) {
        const r = 8 + 26 * bloom;
        const flare = ctx.createRadialGradient(
          g.beamX,
          g.top,
          0,
          g.beamX,
          g.top,
          r,
        );
        flare.addColorStop(0, `rgba(232, 251, 255, ${0.9 * splash})`);
        flare.addColorStop(0.5, hexA(CYAN, 0.5 * splash));
        flare.addColorStop(1, hexA(CYAN, 0));
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = flare;
        ctx.beginPath();
        ctx.arc(g.beamX, g.top, r, 0, Math.PI * 2);
        ctx.fill();
        // Horizontal splash streak along the top edge.
        const streakHalf = 70 * Math.max(bloom, splash);
        ctx.globalAlpha = 0.5 * splash;
        ctx.fillStyle = hexA(SKY, 0.6);
        ctx.fillRect(
          g.beamX - streakHalf,
          g.top - 2.5,
          streakHalf * 2,
          5,
        );
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      // Rim: the lit top edge, from the beam out to each front, curving
      // down the corner arc by the spill length. The segment behind a
      // front is the pour trail — its length IS the pour.
      const rimPath = (side: 1 | -1) => {
        const pour = side === -1 ? pourL : pourR;
        const reach = side === -1 ? reachL : reachR;
        const spill = side === -1 ? spillL : spillR;
        // Flat top runs from beamX to the corner tangent; the arc
        // beyond it is at most the spill length.
        const flat = Math.min(pour, reach - g.radius);
        const arcLen = Math.min(Math.max(0, pour - (reach - g.radius)), spill);
        ctx.beginPath();
        ctx.moveTo(g.beamX, g.top);
        ctx.lineTo(g.beamX + side * flat, g.top);
        if (arcLen > 0.5) {
          const cx =
            side === -1
              ? g.left + g.radius
              : g.right - g.radius;
          const cy = g.top + g.radius;
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + side * (arcLen / g.radius);
          ctx.arc(cx, cy, g.radius, startAngle, endAngle, side === -1);
        }
      };
      if (pourL > 0.5 || pourR > 0.5) {
        // Soft wide pass (source-over, deep cyan — the light-theme carrier).
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = hexA(DEEP_CYAN, 0.55);
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        rimPath(-1);
        ctx.stroke();
        rimPath(1);
        ctx.stroke();
        // Bright pass (additive — the dark-theme carrier).
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = hexA(SKY, 0.5);
        ctx.lineWidth = 7;
        rimPath(-1);
        ctx.stroke();
        rimPath(1);
        ctx.stroke();
        ctx.strokeStyle = "rgba(232, 251, 255, 0.85)";
        ctx.lineWidth = 2.5;
        rimPath(-1);
        ctx.stroke();
        rimPath(1);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }

      // Beads: white-hot discs riding each front while it travels.
      const bead = (side: 1 | -1) => {
        const pour = side === -1 ? pourL : pourR;
        const reach = side === -1 ? reachL : reachR;
        const fill = side === -1 ? fillL : fillR;
        if (pour < 1 || fill > 0.9) return;
        let x: number;
        let y: number;
        const flatEnd = reach - g.radius;
        if (pour <= flatEnd) {
          x = g.beamX + side * pour;
          y = g.top;
        } else {
          const arcLen = pour - flatEnd;
          const cx = side === -1 ? g.left + g.radius : g.right - g.radius;
          const cy = g.top + g.radius;
          const angle = -Math.PI / 2 + side * (arcLen / g.radius);
          x = cx + g.radius * Math.cos(angle);
          y = cy + g.radius * Math.sin(angle);
        }
        const a = 0.9 * (1 - fill * 0.4);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 14);
        glow.addColorStop(0, `rgba(232, 251, 255, ${a})`);
        glow.addColorStop(0.4, hexA(CYAN, 0.5 * a));
        glow.addColorStop(1, hexA(CYAN, 0));
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      };
      bead(-1);
      bead(1);

      // Corner pools: soft glow at each top corner, brightening as the
      // front arrives; they breathe gently at rest.
      const pool = (side: 1 | -1) => {
        const fill = side === -1 ? fillL : fillR;
        const a = 0.15 + 0.5 * fill + 0.08 * breath;
        if (a <= 0.01) return;
        const cx = side === -1 ? g.left + g.radius : g.right - g.radius;
        const grad = ctx.createRadialGradient(cx, g.top, 0, cx, g.top, 24);
        grad.addColorStop(0, hexA(SKY, a));
        grad.addColorStop(0.6, hexA(CYAN, a * 0.5));
        grad.addColorStop(1, hexA(CYAN, 0));
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, g.top, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      };
      pool(-1);
      pool(1);

      // Probe surface for the verification scripts.
      canvas.dataset.laser = JSON.stringify({
        t: Math.round(tMs),
        phase,
        frontY: Math.round(frontY),
        pourL: Math.round(pourL),
        pourR: Math.round(pourR),
        fillL: Number(fillL.toFixed(2)),
        fillR: Number(fillR.toFixed(2)),
        settled,
        mode: reduceMotion ? "static" : "motion",
      });
    };

    if (reduceMotion) {
      // One settled frame, never a loop (metaballs pattern).
      draw(LASER_INTRO_END_MS + 2000, null);
      const onResize = () => draw(LASER_INTRO_END_MS + 2000, null);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    });
    observer.observe(canvas);
    const onHover = () => {
      hoverStart = performance.now();
    };
    anchor.addEventListener("pointerenter", onHover);
    anchor.addEventListener("focus", onHover);

    const loop = () => {
      if (disposed) return;
      // Schedule the next frame FIRST: a draw that throws must never
      // kill the loop (the NaN-gradient bug did exactly that — the
      // dataset froze at t≈1200 and the intro never ran).
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (introStart === null) {
        const bootGone =
          !document.querySelector('[aria-label="System boot sequence"]');
        if (bootGone) introStart = now;
      }
      if (introStart !== null && inView && !document.hidden) {
        const tMs = now - introStart;
        const hoverTau =
          hoverStart === null ? null : (now - hoverStart) / 1000;
        draw(tMs, hoverTau);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      anchor.removeEventListener("pointerenter", onHover);
      anchor.removeEventListener("focus", onHover);
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      data-hero-laser
      aria-hidden="true"
      className="hero-cta-laser"
    />
  );
}
