/**
 * Luminous action buttons for the routes (run-10 RUN10-PAPERS).
 *
 * The paper-page action buttons ("Read the paper" / "Download PDF") and
 * the 404 links ("back home" / "get in touch") were drawing plates —
 * bordered plate + inner margin frame. They are now light controls in
 * the same family as the fold-tab pill and the BibTeX COPY pill: a
 * borderless accent wash, a numbered accent-neon numeral that presses
 * in (220ms ease-out, 1.25→1) and a hairline light rule that draws
 * (0.5s scaleX) on first scroll into view, 45ms stagger per button, an
 * arrow that slides on hover, and the reel-4 0.97 press, with a soft
 * glow on hover.
 *
 * Copy, hrefs, and semantics are verbatim — the label text and the
 * arrow glyph are unchanged, only composed as light controls (the arrow
 * is an aria-hidden decorative span). The PDF button keeps its
 * `journey-pub-pdf-link` class so the print hide still applies.
 * Reduced motion renders the button settled from the first frame via the
 * native hook (motion's useReducedMotion() is unreliable in this app,
 * run-9 iter 1). The breadcrumb links stay plain — wayfinding text,
 * buttons there would be clutter.
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Plate number, 1-based and zero-padded: "01". */
export function paperActionNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

/** The numeral press + rule draw start just after the plate enters view. */
export function paperActionDrawDelay(index: number) {
  return 0.1 + index * 0.045;
}

/** The numeral presses in on the REV-letter / field-note timing (220ms). */
export const PAPER_ACTION_PRESS_MS = 220;

/** The hairline rule draws on the fold-tab / Elsewhere timing (0.5s). */
export const PAPER_ACTION_RULE_MS = 500;

/** The plate presses like the hero CTA (reel-4 press scale). */
export const PAPER_ACTION_PRESS_SCALE = 0.97;

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type PaperActionArrowDirection = "up-right" | "down" | "left" | "right";

export function PaperActionPlate({
  href,
  index,
  label,
  arrow,
  arrowPosition = "after",
  arrowDirection = "right",
  className,
}: {
  readonly href: string;
  readonly index: number;
  readonly label: string;
  readonly arrow: string;
  readonly arrowPosition?: "before" | "after";
  readonly arrowDirection?: PaperActionArrowDirection;
  readonly className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = usePrefersReducedMotion();
  const entered = inView || reduceMotion;
  const delay = paperActionDrawDelay(index);

  const arrowEl = (
    <span
      className={`paper-action-plate-arrow paper-action-plate-arrow--${arrowDirection}`}
      aria-hidden="true"
    >
      {arrow}
    </span>
  );

  return (
    <a
      ref={ref}
      href={href}
      className={
        className
          ? `paper-action-plate ${className}`
          : "paper-action-plate"
      }
    >
      <motion.span
        className="paper-action-plate-num"
        aria-hidden="true"
        initial={{ scale: 1.25, opacity: 0 }}
        animate={entered ? { scale: 1, opacity: 1 } : {}}
        transition={{
          duration: PAPER_ACTION_PRESS_MS / 1000,
          delay,
          ease: SITE_EASE,
        }}
      >
        {paperActionNumber(index)}
      </motion.span>
      {arrowPosition === "before" ? arrowEl : null}
      <span className="paper-action-plate-label">{label}</span>
      {arrowPosition === "after" ? arrowEl : null}
      <motion.span
        className="paper-action-plate-rule"
        aria-hidden="true"
        initial={{ scaleX: 0 }}
        animate={entered ? { scaleX: 1 } : {}}
        transition={{
          duration: PAPER_ACTION_RULE_MS / 1000,
          delay,
          ease: SITE_EASE,
        }}
      />
    </a>
  );
}
