"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

/**
 * RUN9-HERO-VERB-TICKER — the hero thesis line cycles through what Berat
 * actually does (60fps "Brick Intro Value Prop Text Flip", shot 2130,
 * filed iter 42). A static "DOING —" prefix anchors the line; only the
 * verb-led phrase slides up behind the clip boundary, so the ticker reads
 * as a drafting annotation, not a second tagline flip (the tagline is big
 * display type cycling identities; this is small mono uppercase cycling
 * verbs, on a different cycle).
 *
 * Copy comes from content.ts only: four verb-led phrases, each grounded
 * in the bio or the two papers — no invented copy. Mechanics mirror the
 * tagline flip (grid-stacked lines in one clipped cell, outgoing rolls
 * up out, incoming rolls in from below) so the box height never shifts
 * the CTA or signals below. Reduced motion renders the first phrase
 * statically — no interval, no animation.
 */

/** One verb-ticker cycle: each phrase holds ~2.8s before the slide. */
export const VERB_TICKER_MS = 2800;

/** The slide itself: 250ms, the site's ease-out (a touch slower than the
    tagline's 200ms roll, so the two flippers never read as one unit). */
export const VERB_TICKER_DURATION_S = 0.25;

export type HeroVerb = {
  readonly verb: string;
  readonly object: string;
};

/** Pure index step for the cycle (unit-tested, no timers in the test). */
export function nextVerbIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  const safe = Number.isFinite(current) ? Math.floor(current) : 0;
  return (safe + 1) % count;
}

/** "Measuring how LLMs behave in the wild" — the screen-reader line. */
export function verbPhrase(verb: HeroVerb): string {
  return `${verb.verb} ${verb.object}`;
}

export function HeroVerbTicker({
  verbs,
  reduceMotion,
}: {
  readonly verbs: readonly HeroVerb[];
  readonly reduceMotion: boolean;
}) {
  const [cycle, setCycle] = useState({ index: 0, prev: -1 });

  useEffect(() => {
    if (reduceMotion || verbs.length < 2) return;
    const id = window.setInterval(() => {
      setCycle((c) => ({
        index: nextVerbIndex(c.index, verbs.length),
        prev: c.index,
      }));
    }, VERB_TICKER_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, verbs.length]);

  const first = verbs[0];

  // Reduced motion (or a single phrase): the first phrase, static.
  if (reduceMotion || verbs.length < 2 || !first) {
    return (
      <>
        <span data-hero-verb-prefix>Doing —</span>
        {first ? (
          <span data-hero-verb-line data-active="true">
            <span data-hero-verb-word>{first.verb}</span>{" "}
            <span data-hero-verb-object>{first.object}</span>
          </span>
        ) : null}
      </>
    );
  }

  return (
    <>
      <span data-hero-verb-prefix>Doing —</span>
      <span data-hero-verb-flip aria-hidden="true">
        {verbs.map((phrase, i) => (
          <motion.span
            key={verbPhrase(phrase)}
            data-hero-verb-line
            data-active={i === cycle.index}
            initial={false}
            animate={
              i === cycle.index
                ? { y: "0%", opacity: 1 }
                : i === cycle.prev
                  ? { y: "-110%", opacity: 0 }
                  : { y: "110%", opacity: 0 }
            }
            transition={{
              duration: VERB_TICKER_DURATION_S,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span data-hero-verb-word>{phrase.verb}</span>{" "}
            <span data-hero-verb-object>{phrase.object}</span>
          </motion.span>
        ))}
      </span>
    </>
  );
}
