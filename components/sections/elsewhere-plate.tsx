/**
 * Contact directory plate for the Elsewhere rail (run-9 RUN9-ELSEWHERE-PLATE).
 *
 * The rail stops being a bare spec label + plain link list (the last
 * untransformed block on the home page — audit, iter 19) and becomes a
 * bordered directory plate in the drawing set's language: sheet head
 * ("Elsewhere — Sheet 07B"), "+" registration marks, numbered directory
 * rows (01 GitHub / 02 LinkedIn / 03 Resume / 04 View without animations),
 * and a title-block footer (Directory / Entries / Scale). The plate's card
 * background sits above the particle bust, which used to stipple across
 * the bare ↗ arrows.
 *
 * Each row's numeral presses in (220ms ease-out, scale 1.25→1) and its
 * hairline rule draws (0.5s scaleX) on first scroll into view, 45ms
 * stagger per row — the same press/draw vocabulary as the REV letters and
 * the field-note numerals, so the sections read as one drawing set.
 * Link semantics are verbatim: the same ExternalLink / MotionVersionLink
 * elements, hrefs, download flags, and aria-label. Reduced motion: the
 * plate renders settled from the first frame (native hook — motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import type { ReactNode } from "react";
import { useRef } from "react";

import type { PortfolioContent } from "@/data/content";

import { MotionVersionLink } from "@/components/chrome/motion-version-link";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { ExternalLink } from "@/components/ui/external-link";

/** Directory entry number, 1-based and zero-padded: "01". */
export function elsewhereEntryNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

/** The directory counts the profile links plus the motion-version link. */
export function elsewhereEntryCount(linkCount: number) {
  return String(linkCount + 1).padStart(2, "0");
}

/** The row press + rule draw start just after the plate enters view. */
export function elsewhereDrawDelay(index: number) {
  return 0.1 + index * 0.045;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PRESS_DURATION = 0.22;
const RULE_DURATION = 0.5;

export function ElsewherePlate({
  links,
}: {
  readonly links: PortfolioContent["contact"]["links"];
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = usePrefersReducedMotion();
  const pressed = inView || reduceMotion;
  const entryCount = elsewhereEntryCount(links.length);

  return (
    <nav
      ref={ref}
      className="journey-col-rail journey-elsewhere"
      aria-label="Contact links"
    >
      <span
        className="journey-sheet-crop journey-sheet-crop--left"
        aria-hidden="true"
      >
        +
      </span>
      <span
        className="journey-sheet-crop journey-sheet-crop--right"
        aria-hidden="true"
      >
        +
      </span>
      <div className="journey-sheet-head">
        <span>Elsewhere</span>
        <span>Sheet 07B</span>
      </div>
      <ul className="journey-contact-list">
        {links.map((link, index) => (
          <ElsewhereRow
            key={link.href}
            index={index}
            pressed={pressed}
            reduceMotion={reduceMotion}
          >
            <ExternalLink
              href={link.href}
              download={link.download}
              className="journey-contact-link"
            >
              {link.label}
            </ExternalLink>
          </ElsewhereRow>
        ))}
        <ElsewhereRow
          index={links.length}
          pressed={pressed}
          reduceMotion={reduceMotion}
        >
          <MotionVersionLink className="journey-contact-link" />
        </ElsewhereRow>
      </ul>
      <div className="journey-sheet-titleblock">
        <div>
          <span className="journey-sheet-titleblock-label">Directory</span>
          Elsewhere
        </div>
        <div>
          <span className="journey-sheet-titleblock-label">Entries</span>
          {entryCount}
        </div>
        <div>
          <span className="journey-sheet-titleblock-label">Scale</span>
          1:1
        </div>
      </div>
    </nav>
  );
}

function ElsewhereRow({
  index,
  pressed,
  reduceMotion,
  children,
}: {
  readonly index: number;
  readonly pressed: boolean;
  readonly reduceMotion: boolean;
  readonly children: ReactNode;
}) {
  const delay = elsewhereDrawDelay(index);
  return (
    <li className="journey-elsewhere-row">
      <motion.span
        aria-hidden="true"
        className="journey-elsewhere-num"
        // Key the press to the DRAW, not to mount: an opacity target of 1
        // in the pre-press branch would animate to settled while the plate
        // is still below the fold (same class of bug as the iter-3 pen
        // trace and the iter-4 venue stamp). Under reduced motion the
        // numeral renders settled from the first frame.
        initial={{
          opacity: reduceMotion ? 1 : 0,
          scale: reduceMotion ? 1 : 1.25,
        }}
        animate={
          pressed
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 1.25 }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: PRESS_DURATION, delay, ease: SITE_EASE }
        }
      >
        {elsewhereEntryNumber(index)}
      </motion.span>
      <span className="sr-only">{elsewhereEntryNumber(index)}: </span>
      {children}
      <motion.span
        aria-hidden="true"
        className="journey-elsewhere-row-rule"
        initial={{ scaleX: reduceMotion ? 1 : 0 }}
        animate={{ scaleX: pressed ? 1 : 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: RULE_DURATION,
                delay: delay + 0.12,
                ease: SITE_EASE,
              }
        }
      />
    </li>
  );
}
