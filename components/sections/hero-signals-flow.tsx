/**
 * Hero signals as flowing light (run-10 RUN10-HERO-FLOW).
 *
 * Run 9's stamped STATUS plate is gone — no sheet head ("Status —
 * Sheet 01"), no "+" registration marks, no press-in numerals, no
 * drawn hairline rules, no card face. The three facts are three rows
 * of light: each row opens with a small glowing dot (the ribbon's
 * light, distilled) and the label/value pair beside it, breathing
 * gently in sequence. Copy is verbatim from content.ts; the "Open to"
 * link keeps its href and quiet underline.
 *
 * Rows fade-rise on first view, 60ms stagger per row, after the dl's
 * own 0.24s entrance — the same stagger family as the old plate's
 * press-and-draw, retimed for light instead of ink. Reduced motion
 * renders the rows settled from the first frame (native hook —
 * motion's useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import type { PortfolioContent } from "@/data/content";

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** The dl's own entrance stagger, unchanged from the plate. */
const FLOW_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * A row's fade-rise starts just after the dl's own entrance fade
 * begins (the dl fades in from 0.24s), 60ms stagger per row.
 */
export function signalRowDelay(index: number) {
  return 0.5 + index * 0.06;
}

/** Row fade-rise duration, seconds. */
export const HERO_SIGNAL_FLOW_DURATION = 0.5;

export function HeroSignalsFlow({
  signals,
  reduceMotion,
}: {
  readonly signals: PortfolioContent["hero"]["signals"];
  readonly reduceMotion: boolean;
}) {
  const ref = useRef<HTMLDListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const shown = inView || reduceMotion;

  return (
    <motion.dl
      ref={ref}
      data-hero-signals
      className="hero-signals-flow"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.95, ease: FLOW_EASE, delay: 0.24 }
      }
    >
      {signals.map((signal, index) => (
        <motion.div
          key={signal.label}
          data-hero-signal
          initial={
            reduceMotion ? false : { opacity: 0, y: 8 }
          }
          animate={
            shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  duration: HERO_SIGNAL_FLOW_DURATION,
                  delay: signalRowDelay(index),
                  ease: SITE_EASE,
                }
          }
        >
          <span
            aria-hidden="true"
            className="hero-signals-dot"
            data-hero-signal-dot
            style={{ animationDelay: `${index * 0.7}s` }}
          />
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
        </motion.div>
      ))}
    </motion.dl>
  );
}
