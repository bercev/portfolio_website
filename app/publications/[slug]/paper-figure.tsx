/**
 * Paper-page figure, light/flow (run-10 RUN10-PAPERS): the first-page
 * preview arrives as light washing in — a soft accent glow that fades
 * as the figure settles into place over the first 200px of page scroll,
 * sprung so the settle eases rather than tracking scroll 1:1. The
 * drafting chrome is gone: no dimension frame, no FIG. title-block
 * strip, no venue stamp — the caption is one quiet light line ("First
 * page · 817 × 867", the preview's real pixel dims, so the figure still
 * says something true). Scroll-linked to the PAGE scroll (the figure is
 * already in view at load on both widths, so a target-based range would
 * be settled before the reader ever sees it). Transform-only: no layout
 * shift. Reduced motion: the settled figure from the first frame
 * (native hook — motion's useReducedMotion() is unreliable in this app,
 * run-9 iter 1).
 */
"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { Publication } from "@/data/content";

/** Glow-in state: the figure arrives 3% large and 24px down, haloed. */
export const PAPER_FIGURE_GLOW_SCALE = 1.03;
export const PAPER_FIGURE_GLOW_Y_PX = 24;
/** Page scroll over which the figure settles (px): the figure is still
 * comfortably in view at both widths when the settle completes. */
export const PAPER_FIGURE_SETTLE_SCROLL_PX = 200;
/** Glow halo at full glow: blur and spread in px. */
export const PAPER_FIGURE_GLOW_BLUR_PX = 64;
export const PAPER_FIGURE_GLOW_SPREAD_PX = 16;
/** Accent share of the halo at full glow (percent, via color-mix). */
export const PAPER_FIGURE_GLOW_ALPHA_PCT = 40;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Scroll progress (0 = page top, 1 = settled after
 * PAPER_FIGURE_SETTLE_SCROLL_PX) to the settled transform. Pure so the
 * mapping stays testable without rendering.
 */
export function paperFigureSettle(progress: number): {
  readonly scale: number;
  readonly y: number;
  /** 1 = fully haloed, 0 = settled. */
  readonly glow: number;
} {
  const p = clamp01(progress);
  const remaining = 1 - p;
  return {
    scale: PAPER_FIGURE_GLOW_SCALE + (1 - PAPER_FIGURE_GLOW_SCALE) * p,
    y: PAPER_FIGURE_GLOW_Y_PX * remaining,
    glow: remaining,
  };
}

/** The accent halo for a given glow amount (0 = settled, no halo). */
export function paperFigureGlow(glow: number): string {
  const l = clamp01(glow);
  if (l <= 0) return "0 0px 0px 0px rgba(0, 0, 0, 0)";
  return `0 0 ${Math.round(PAPER_FIGURE_GLOW_BLUR_PX * l)}px ${Math.round(PAPER_FIGURE_GLOW_SPREAD_PX * l)}px color-mix(in srgb, var(--accent-neon) ${Math.round(PAPER_FIGURE_GLOW_ALPHA_PCT * l)}%, transparent)`;
}

/** A pixel count, rounded; anything unusable prints as an em dash. */
function dimensionText(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return String(Math.round(value));
}

/**
 * The figure's quiet light caption: "First page" plus the preview's
 * real pixel dims when usable, so the figure still measures something
 * true without a dimension frame.
 */
export function figCaptionText(width: number, height: number): string {
  const w = dimensionText(width);
  const h = dimensionText(height);
  if (w === "—" || h === "—") return "First page";
  return `First page · ${w} × ${h}`;
}

export function PaperFigure({
  publication,
}: {
  readonly publication: Publication;
}) {
  const reduceMotion = usePrefersReducedMotion();
  // Page scroll, not a target range: the figure is already in view at
  // load on both widths (top ~390px), so a target-based offset would
  // report progress 1 before the reader sees anything. The settle runs
  // over the first 200px of page scroll instead — haloed at load,
  // settled once the reader has scrolled a little.
  const { scrollY } = useScroll();
  const progress = useTransform(
    scrollY,
    [0, PAPER_FIGURE_SETTLE_SCROLL_PX],
    [0, 1],
  );
  // Soft spring on the scroll progress: the settle eases into place
  // instead of tracking the scroll position rigidly (house spring feel,
  // cf. the signal spine's stiffness 120 / damping 24).
  const sprung = useSpring(progress, {
    stiffness: 110,
    damping: 22,
    mass: 0.35,
  });
  const scale = useTransform(sprung, (p) => paperFigureSettle(p).scale);
  const y = useTransform(sprung, (p) => paperFigureSettle(p).y);
  const boxShadow = useTransform(sprung, (p) =>
    paperFigureGlow(paperFigureSettle(p).glow),
  );
  const caption = (
    <figcaption className="journey-pub-fig-flow">
      {figCaptionText(publication.preview.width, publication.preview.height)}
    </figcaption>
  );

  if (reduceMotion) {
    return (
      <figure
        data-paper-figure
        className="journey-pub-figure journey-pub-page-figure"
      >
        <a href={publication.href} className="journey-pub-figure-link">
          {/* eslint-disable-next-line @next/next/no-img-element -- local paper preview, same as the list plate */}
          <img
            src={publication.preview.src}
            alt={publication.preview.alt}
            width={publication.preview.width}
            height={publication.preview.height}
          />
        </a>
        {caption}
      </figure>
    );
  }

  return (
    <motion.figure
      data-paper-figure
      className="journey-pub-figure journey-pub-page-figure"
      style={{ scale, y }}
    >
      <motion.a
        href={publication.href}
        className="journey-pub-figure-link"
        style={{ boxShadow }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local paper preview, same as the list plate */}
        <img
          src={publication.preview.src}
          alt={publication.preview.alt}
          width={publication.preview.width}
          height={publication.preview.height}
        />
      </motion.a>
      {caption}
    </motion.figure>
  );
}
