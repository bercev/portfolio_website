/**
 * Hero signals as a stamped STATUS plate (run-9 RUN9-HERO-SIGNALS).
 *
 * The strip was the last hero element with zero drafting treatment —
 * three bare label/value rows ("Now / Building products", "Published /
 * ICML 2026 AIWILD · arXiv", "Open to / Software engineering roles").
 * It becomes a bordered status plate in the drawing set's language:
 * sheet head ("Status — Sheet 01"), "+" registration marks, numbered
 * status lines with press-in numerals and drawn hairline rules, inner
 * margin frame. Copy is verbatim from content.ts; the "Open to" link
 * keeps its href and quiet underline.
 *
 * Each line's numeral presses in (220ms ease-out, scale 1.25→1) and its
 * hairline rule draws (0.5s scaleX) on first view, 45ms stagger per
 * line — the Elsewhere-plate / REV-letter press-and-draw family. The
 * press is keyed to the draw, not to mount: an opacity target of 1 in
 * the pre-press branch would animate to settled while the plate is
 * still below the fold (same class of bug as the iter-3 pen trace).
 * Reduced motion renders the plate settled from the first frame (native
 * hook — motion's useReducedMotion() is unreliable in this app,
 * run-9 iter 1). The plate's 78% card face sits above the particle
 * bust, which yields to content anyway (run-9 iter 36).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import type { PortfolioContent } from "@/data/content";
import {
  HERO_SIGNAL_PRESS_DURATION,
  HERO_SIGNAL_RULE_DURATION,
  heroSignalDrawDelay,
  heroSignalNumber,
} from "@/lib/hero-signals";

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** The dl's own entrance stagger, unchanged from the bare strip. */
const PLATE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function HeroSignalsPlate({
  signals,
  reduceMotion,
}: {
  readonly signals: PortfolioContent["hero"]["signals"];
  readonly reduceMotion: boolean;
}) {
  const ref = useRef<HTMLDListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const pressed = inView || reduceMotion;

  return (
    <motion.dl
      ref={ref}
      data-hero-signals
      className="hero-signals-plate"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.95, ease: PLATE_EASE, delay: 0.24 }
      }
    >
      <div className="hero-signals-head" data-hero-signals-head>
        {/* Absolute (journey-sheet-crop) so they never join the flex row. */}
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
        <span>Status</span>
        <span>Sheet 01</span>
      </div>
      {signals.map((signal, index) => {
        const delay = heroSignalDrawDelay(index);
        return (
          <div key={signal.label} data-hero-signal>
            <motion.span
              aria-hidden="true"
              className="hero-signals-num"
              data-hero-signal-num
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
                  : {
                      duration: HERO_SIGNAL_PRESS_DURATION,
                      delay,
                      ease: SITE_EASE,
                    }
              }
            >
              {heroSignalNumber(index)}
            </motion.span>
            <span className="sr-only">{heroSignalNumber(index)}: </span>
            <dt>{signal.label}</dt>
            <dd>
              {signal.href ? (
                <a href={signal.href} data-hero-signal-link>
                  {signal.value}
                </a>
              ) : (
                signal.value
              )}
            </dd>
            <motion.span
              aria-hidden="true"
              className="hero-signals-rule"
              data-hero-signal-rule
              initial={{ scaleX: reduceMotion ? 1 : 0 }}
              animate={{ scaleX: pressed ? 1 : 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: HERO_SIGNAL_RULE_DURATION,
                      delay: delay + 0.12,
                      ease: SITE_EASE,
                    }
              }
            />
          </div>
        );
      })}
    </motion.dl>
  );
}
