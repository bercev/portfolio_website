/**
 * Live ECG / pulse trace for the contact dispatch sheet (run-9
 * RUN9-SECTION-IDENTITIES, contact slice — folds in RUN9-DETAIL-ECG from
 * the 60fps.design research pass: Runmo Lab Pulse Heart ECG Interaction).
 *
 * The contact section is the site's last static surface, so it gets the
 * living signature moment: a heartbeat line that draws itself across the
 * sheet header in real time — one beat per second, scrolling left — the
 * dispatch sheet's proof that the line is live. Reduced motion: one
 * static settled trace, no loop (native hook — motion's useReducedMotion()
 * is unreliable in this app, run-9 iter 1).
 */
"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Milliseconds per heartbeat (60 BPM). */
export const ECG_BEAT_MS = 1000;
/** Horizontal scroll speed of the trace, CSS px per second. */
export const ECG_PX_PER_SEC = 90;

/**
 * One heartbeat as a sum of gaussians over phase [0, 1): a small P wave,
 * the QRS complex (Q dip, tall R spike, S dip), and a broad T wave.
 * Baseline between beats is ~0. Pure — unit-tested in contact-ecg.test.ts.
 */
export function ecgValue(phase: number): number {
  const p = ((phase % 1) + 1) % 1;
  const gauss = (center: number, width: number, amp: number) => {
    const d = p - center - Math.round(p - center);
    return amp * Math.exp(-((d / width) ** 2));
  };
  return (
    gauss(0.12, 0.035, 0.14) + // P wave
    gauss(0.18, 0.012, -0.18) + // Q dip
    gauss(0.2, 0.008, 1) + // R spike
    gauss(0.225, 0.012, -0.28) + // S dip
    gauss(0.36, 0.05, 0.28) // T wave
  );
}

export function ContactEcg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--portfolio-accent")
        .trim() || "#7dd3fc";

    let raf = 0;
    let width = 0;
    let height = 0;

    const draw = (nowMs: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w !== width || h !== height) {
        width = w;
        height = h;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const midY = height / 2;
      const amp = height * 0.36;
      // Faint baseline — the drafting-table hairline the trace sits on.
      ctx.strokeStyle = "rgba(125, 211, 252, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
      // The trace: for each x, the beat phase at that moment in the
      // scrolling window (now at the right edge, older to the left).
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const t = nowMs - ((width - x) / ECG_PX_PER_SEC) * 1000;
        const y = midY - ecgValue(t / ECG_BEAT_MS) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    if (reduceMotion) {
      // Static settled trace: a fixed moment with the R spike at the
      // right edge (phase 0.2 at now = 200ms).
      draw(ECG_BEAT_MS * 0.2);
      return;
    }
    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      data-contact-ecg
      className="journey-dispatch-ecg"
      aria-hidden="true"
    />
  );
}
