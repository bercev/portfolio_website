/**
 * Journey epilogue (run-9 iter 18, RUN9-EPILOGUE-SIGNOFF; re-skinned
 * run-10 RUN10-RAIL; plate de-drafted run-10 RUN10-EPILOGUE). The scroll
 * journey used to end dead at the contact station: three bare lines on
 * open background (run-2 iter 49, static by design). It is now the
 * journey's sign-off — a borderless haloed closing card in the
 * contact-form family (card wash + accent halo, no border, no inner
 * frame, no crop marks) with a glow-dot head line ("End of the journey —
 * 07 / 07") under a light rule, the ASCII BERAT mark, the same sign-off
 * line, a colophon of verified facts (typefaces from app/layout.tsx,
 * Next.js from package.json), and the loop-back as a luminous pill
 * ("Back to the top ↑").
 *
 * Motion (60fps Circle Splash Bubbles Pop, shot 2131, read this
 * iteration): the sign-off's three elements pop in as a cluster on
 * first view — scale 0.6 with a spring that overshoots, staggered, the
 * way Circle's avatar bubbles spring into existence — then settle and
 * stay. The head presses in (the run-9 220ms press language).
 * Entry-only: a footer should rest, not chatter, so Circle's idle loop
 * is deliberately not carried over. Reduced motion: everything renders
 * settled from the first frame (native hook — motion's useReducedMotion()
 * is unreliable in this app, run-9 iter 1).
 *
 * Archive strip (run-10 RUN10-ARCHIVE, Brittany Chiang move from the
 * CS-portfolio note): one quiet light line of previous versions —
 * earlier site → current site → this direction. Lineage only, no dates,
 * no links: no archived edition URL was ever verified, so none is
 * claimed or linked (same discipline as the run-5 mockup lineage
 * strips). It pops with the cluster at delay index 2; the loop-back
 * follows at index 3.
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** The sign-off elements pop in staggered, mark → line → stamp. */
export function epiloguePopDelay(index: number) {
  return 0.05 + index * 0.12;
}

/** Circle's overshoot: an underdamped spring (damping ratio < 1), so the
 * pop visibly overshoots 1 before settling — pinned by test. */
export const EPILOGUE_POP_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 16,
} as const;

/** The lineage strip (run-10 RUN10-ARCHIVE): earlier site → current
 * site → this direction. Names + statuses only — no dates, no links,
 * no invented versions; pinned by test. */
export const EPILOGUE_ARCHIVE = [
  { name: "Earlier site", status: "Superseded" },
  { name: "Current site", status: "Live" },
  { name: "Light and flow", status: "This edition" },
] as const;

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PRESS_DURATION = 0.22;

export function JourneyEpilogue() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = usePrefersReducedMotion();
  const popped = inView && !reduceMotion;

  return (
    <footer
      data-journey-epilogue
      data-light-chapter="epilogue"
      aria-label="End of the journey"
      className="journey-epilogue"
    >
      <div ref={ref} className="journey-epilogue-plate">
        <motion.div
          className="journey-epilogue-flow-head"
          initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 1.25 }}
          animate={
            popped || reduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 1.25 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: PRESS_DURATION, ease: SITE_EASE }
          }
        >
          <span className="journey-epilogue-flow-head-num">End of the journey</span>
          <span>07 / 07</span>
        </motion.div>
        <motion.p
          aria-hidden="true"
          className="journey-epilogue-mark"
          initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.6 }}
          animate={
            popped || reduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.6 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { ...EPILOGUE_POP_SPRING, delay: epiloguePopDelay(0) }
          }
        >
          ░▒▓ BERAT ▓▒░
        </motion.p>
        <motion.p
          className="journey-epilogue-line"
          initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.6 }}
          animate={
            popped || reduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.6 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { ...EPILOGUE_POP_SPRING, delay: epiloguePopDelay(1) }
          }
        >
          Thanks for reading to the bottom.
        </motion.p>
        <motion.p
          className="journey-epilogue-colophon"
          initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.6 }}
          animate={
            popped || reduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.6 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { ...EPILOGUE_POP_SPRING, delay: epiloguePopDelay(1) }
          }
        >
          Set in Bricolage Grotesque + JetBrains Mono · Made by Berat ·
          Built with Next.js
        </motion.p>
        <motion.div
          data-epilogue-archive
          role="group"
          aria-label="Previous versions"
          className="journey-epilogue-archive"
          initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.6 }}
          animate={
            popped || reduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.6 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { ...EPILOGUE_POP_SPRING, delay: epiloguePopDelay(2) }
          }
        >
          <span className="journey-epilogue-archive-label">
            Previous versions
          </span>
          {EPILOGUE_ARCHIVE.map((entry) => (
            <span
              key={entry.name}
              data-epilogue-archive-item
              className="journey-epilogue-archive-item"
            >
              <span>{entry.name}</span>
              <span aria-hidden="true">·</span>
              <span className="journey-epilogue-archive-status">
                {entry.status}
              </span>
            </span>
          ))}
        </motion.div>
        <motion.a
          href="#home"
          className="journey-epilogue-loop"
          initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.6 }}
          animate={
            popped || reduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.6 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { ...EPILOGUE_POP_SPRING, delay: epiloguePopDelay(3) }
          }
        >
          Back to the top ↑
        </motion.a>
      </div>
    </footer>
  );
}
