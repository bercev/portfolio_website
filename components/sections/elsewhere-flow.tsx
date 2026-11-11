/**
 * Contact directory in light/flow (run-10 RUN10-ELSEWHERE): the Elsewhere
 * rail stops being a bordered directory plate in the drawing set's
 * language and becomes a borderless haloed flow — a glow-dot head
 * ("Elsewhere" / "07 / 07", the chapter, under a light rule), numbered
 * directory rows (01 GitHub / 02 LinkedIn / 03 Resume / 04 View without
 * animations) whose numerals press in and whose light rules draw on
 * first scroll into view, and a quiet glow-dot footer ("Directory ·
 * 04 entries"). No sheet head, no "+" registration marks, no inner
 * frame, no title block, no Scale — the card background still sits
 * above the particle bust, which used to stipple across the bare ↗
 * arrows.
 *
 * Each row's numeral presses in (220ms ease-out, scale 1.25→1) and its
 * light rule draws (0.5s scaleX) on first scroll into view, 45ms
 * stagger per row — the same press/draw vocabulary as the publications
 * rows and the paper figures, so the sections read as one light set.
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

export function ElsewhereFlow({
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
      className="journey-col-rail journey-elsewhere-flow"
      aria-label="Contact links"
    >
      <div className="journey-elsewhere-flow-head">
        <span className="journey-elsewhere-flow-head-num">Elsewhere</span>
        <span>07 / 07</span>
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
      <div className="journey-elsewhere-flow-footer">
        Directory · {entryCount} entries
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
    <li className="journey-elsewhere-flow-row">
      <motion.span
        aria-hidden="true"
        className="journey-elsewhere-flow-num"
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
        className="journey-elsewhere-flow-rule"
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
