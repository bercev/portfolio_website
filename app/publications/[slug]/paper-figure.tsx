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

/**
 * FIG. plate dimension frame (run-9 RUN9-PAPER-BACKGROUND round 2):
 * the first-page plate is a measured drawing — dimension lines with end
 * ticks frame its top and sides, 10px out, drawing in on load (top
 * first, sides 150ms later). The lines are plain divs inside the
 * figure link (no SVG scaling), pointer-events none so the venue link
 * keeps working; the venue stamp presses over the right line's lower
 * end by design. Reduced motion: settled from the first frame via the
 * CSS media query (same class as the hero measure frame).
 */
export const FIG_MEASURE_OFFSET_PX = 10;
export const FIG_MEASURE_DRAW_MS = 600;
export const FIG_MEASURE_TOP_DELAY_MS = 400;
export const FIG_MEASURE_SIDE_DELAY_MS = 550;
/** Dimension-numeral fade (run-9 RUN9-PAPER-COMPOSITION): the labels
 * fade in once their line has drawn — top label after the top line
 * lands (400 + 600), side labels after the sides land (550 + 600). */
export const FIG_MEASURE_LABEL_TOP_DELAY_MS = 1050;
export const FIG_MEASURE_LABEL_SIDE_DELAY_MS = 1200;
export const FIG_MEASURE_LABEL_FADE_MS = 300;

/** A dimension extent as printed on the frame: the preview's real pixel
 * count, rounded; anything unusable prints as an em dash, never NaN. */
function dimensionText(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return String(Math.round(value));
}

/**
 * The numerals printed on the FIG. plate's dimension frame (run-9
 * RUN9-PAPER-COMPOSITION): the top line measures the plate's width, the
 * side lines its height — the preview image's real pixel dims from
 * content.ts, so the drawing measures something true.
 */
export function figMeasureLabels(
  width: number,
  height: number,
): { readonly top: string; readonly side: string } {
  return { top: dimensionText(width), side: dimensionText(height) };
}

/** One cell of the figure's title-block strip. */
export interface FigTitleBlockCell {
  readonly label: string;
  readonly value: string;
}

/**
 * The figure's title-block strip (run-9 RUN9-PAPER-COMPOSITION): FIG
 * number, sheet name, real preview size, and the drawing scale — the
 * strip REPLACES the old "FIG. 01 — First page" caption line (same
 * facts, plus the measured size), so the caption is not duplicated.
 */
export function figTitleBlockCells(
  figLabel: string,
  width: number,
  height: number,
): readonly FigTitleBlockCell[] {
  const number = /(\d+)/.exec(figLabel)?.[1] ?? "—";
  const w = dimensionText(width);
  const h = dimensionText(height);
  return [
    { label: "FIG", value: number },
    { label: "SHEET", value: "First page" },
    { label: "SIZE", value: w === "—" || h === "—" ? "—" : `${w} × ${h} PX` },
    { label: "SCALE", value: "1:1" },
  ];
}

function FigMeasure({ width, height }: { readonly width: number; readonly height: number }) {
  const labels = figMeasureLabels(width, height);
  return (
    <>
      <span
        aria-hidden="true"
        data-fig-measure="top"
        className="fig-measure fig-measure-top"
        style={{ animationDelay: `${FIG_MEASURE_TOP_DELAY_MS}ms` }}
      />
      <span
        aria-hidden="true"
        data-fig-measure="left"
        className="fig-measure fig-measure-left"
        style={{ animationDelay: `${FIG_MEASURE_SIDE_DELAY_MS}ms` }}
      />
      <span
        aria-hidden="true"
        data-fig-measure="right"
        className="fig-measure fig-measure-right"
        style={{ animationDelay: `${FIG_MEASURE_SIDE_DELAY_MS}ms` }}
      />
      {/* Dimension numerals (RUN9-PAPER-COMPOSITION): mono numerals on a
        sheet-colored chip that breaks the line, fading in once the line
        has drawn. Siblings of the lines (not children) so the draw's
        scaleX/scaleY never squashes the text; aria-hidden — the
        title-block strip below carries the same dims as real text. */}
      <span
        aria-hidden="true"
        data-fig-measure-label="top"
        className="fig-measure-label fig-measure-label-top"
        style={{ animationDelay: `${FIG_MEASURE_LABEL_TOP_DELAY_MS}ms` }}
      >
        {labels.top}
      </span>
      <span
        aria-hidden="true"
        data-fig-measure-label="left"
        className="fig-measure-label fig-measure-label-left"
        style={{ animationDelay: `${FIG_MEASURE_LABEL_SIDE_DELAY_MS}ms` }}
      >
        {labels.side}
      </span>
      <span
        aria-hidden="true"
        data-fig-measure-label="right"
        className="fig-measure-label fig-measure-label-right"
        style={{ animationDelay: `${FIG_MEASURE_LABEL_SIDE_DELAY_MS}ms` }}
      >
        {labels.side}
      </span>
    </>
  );
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
  // Shared by both branches: the measured frame (real preview dims) and
  // the title-block strip that replaces the old caption line.
  const measure = (
    <FigMeasure
      width={publication.preview.width}
      height={publication.preview.height}
    />
  );
  const titleBlock = (
    <figcaption className="journey-pub-fig-titleblock">
      {figTitleBlockCells(
        figLabel,
        publication.preview.width,
        publication.preview.height,
      ).map((cell) => (
        <span key={cell.label} className="journey-pub-fig-cell">
          <span className="journey-pub-fig-cell-label">{cell.label}</span>
          <span className="journey-pub-fig-cell-value">{cell.value}</span>
        </span>
      ))}
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
          {measure}
        </a>
        <VenueStamp venue={publication.venue} index={index} />
        {titleBlock}
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
        {measure}
      </motion.a>
      <VenueStamp venue={publication.venue} index={index} />
      {titleBlock}
    </motion.figure>
  );
}
