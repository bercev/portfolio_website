/**
 * Paper-page FIG. plate, header-asset treatment (run-9
 * RUN9-PAPER-HEADER-ASSET): the App Store App Page Header Asset
 * Animation (60fps shot 2124) restyled to the drafting language — the
 * first-page plate arrives as a sheet held above the drawing and settles
 * flat as the reader scrolls. Scroll-linked to the PAGE scroll (the
 * plate is already in view at load on both widths, so a target-based
 * range would be settled before the reader ever sees it): raised +
 * slightly enlarged + tilted + lifted paper shadow at scroll 0, easing
 * to scale 1 / y 0 / rotate 0 / no shadow over the first 200px of
 * scrolling, sprung so the settle eases rather than tracking scroll 1:1.
 * The tilt is the drafting cue — a sheet placed at an angle, straightened
 * as it lands; the shadow is large and soft so the lift reads on the
 * dark sheet. Reversible on scroll-back, like the reference.
 * Transform-only: no layout shift, the venue stamp rides along as a
 * child, and the caption lifts with the plate. Reduced motion: the
 * settled flat plate from the first frame (native hook — motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { Publication } from "@/data/content";
import { VenueStamp } from "@/components/sections/publication-plate";

/** Raised state: the sheet floats 8% large, 48px up, and 1.5° askew off
 * the drawing — bold enough to read at a glance (round-1's 5% / 32px /
 * untilted state failed both critics on visibility). */
export const PAPER_FIGURE_RAISED_SCALE = 1.08;
export const PAPER_FIGURE_RAISED_Y_PX = 48;
export const PAPER_FIGURE_RAISED_ROTATE_DEG = -1.5;
/** Page scroll over which the plate settles (px): the plate is still
 * comfortably in view at both widths when the settle completes. */
export const PAPER_FIGURE_SETTLE_SCROLL_PX = 200;
/** Lifted paper shadow at full raise (fades to a flat plate) — large and
 * soft so the lift reads on the dark sheet (round-1's 0.4α shadow was
 * invisible against the navy in both critics' frames). */
export const PAPER_FIGURE_LIFT_SHADOW_ALPHA = 0.55;

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
  /** Degrees, negative = counter-clockwise askew; 0 = straight. */
  readonly rotate: number;
  /** 1 = fully lifted, 0 = settled flat. */
  readonly lift: number;
} {
  const p = clamp01(progress);
  const remaining = 1 - p;
  return {
    scale: PAPER_FIGURE_RAISED_SCALE + (1 - PAPER_FIGURE_RAISED_SCALE) * p,
    y: PAPER_FIGURE_RAISED_Y_PX * remaining,
    // -1.5 * 0 is -0; normalize so the settled state is exactly 0.
    rotate: remaining === 0 ? 0 : PAPER_FIGURE_RAISED_ROTATE_DEG * remaining,
    lift: remaining,
  };
}

/** The lifted paper shadow for a given lift amount (0 = flat, no shadow). */
export function paperFigureShadow(lift: number): string {
  const l = clamp01(lift);
  if (l <= 0) return "0 0px 0px 0px rgba(0, 0, 0, 0)";
  return `0 ${Math.round(40 * l)}px ${Math.round(80 * l)}px ${Math.round(-16 * l)}px rgba(0, 0, 0, ${(PAPER_FIGURE_LIFT_SHADOW_ALPHA * l).toFixed(3)})`;
}

export function PaperFigure({
  publication,
  index,
  figLabel,
}: {
  readonly publication: Publication;
  readonly index: number;
  readonly figLabel: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  // Page scroll, not a target range: the plate is already in view at
  // load on both widths (top ~390px), so a target-based offset would
  // report progress 1 before the reader sees anything. The settle runs
  // over the first 240px of page scroll instead — raised at load,
  // flat once the reader has scrolled a little.
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
  const rotate = useTransform(sprung, (p) => paperFigureSettle(p).rotate);
  const boxShadow = useTransform(sprung, (p) =>
    paperFigureShadow(paperFigureSettle(p).lift),
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
        <VenueStamp venue={publication.venue} index={index} />
        <figcaption className="journey-pub-fig-caption">
          {figLabel} — First page
        </figcaption>
      </figure>
    );
  }

  return (
    <motion.figure
      data-paper-figure
      className="journey-pub-figure journey-pub-page-figure"
      style={{ scale, y, rotate }}
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
      <VenueStamp venue={publication.venue} index={index} />
      <figcaption className="journey-pub-fig-caption">
        {figLabel} — First page
      </figcaption>
    </motion.figure>
  );
}
