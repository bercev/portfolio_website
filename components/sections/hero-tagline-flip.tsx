"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

/**
 * RUN9-DETAIL-LEDE-FLIP — the hero tagline rolls through Berat's working
 * identities (60fps "Brick Intro Value Prop Text Flip", shot 2129, read
 * 2026-11-09). Copy comes from content.ts only: the tagline, the LLM
 * researcher role, and the AI systems engineer role.
 *
 * Mechanics: all lines stack in one grid cell, so the container's height is
 * always the tallest line's — the CTA and signals below never shift. The
 * active line sits at y 0; the line that just left rolls up out of view and
 * the next rolls in from below (200ms, the site's ease-out). Reduced motion
 * renders only the first line, statically — no interval, no animation.
 */

/** One lede-flip cycle: each identity holds ~3s before the roll. */
export const TAGLINE_FLIP_MS = 3000;

/** The roll itself: 200ms, the site's ease-out. */
export const TAGLINE_FLIP_DURATION_S = 0.2;

/** Pure index step for the cycle (unit-tested, no timers in the test). */
export function nextTaglineIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  const safe = Number.isFinite(current) ? Math.floor(current) : 0;
  return (safe + 1) % count;
}

export function HeroTaglineFlip({
  lines,
  reduceMotion,
}: {
  readonly lines: readonly string[];
  readonly reduceMotion: boolean;
}) {
  const [cycle, setCycle] = useState({ index: 0, prev: -1 });

  useEffect(() => {
    if (reduceMotion || lines.length < 2) return;
    const id = window.setInterval(() => {
      setCycle((c) => ({
        index: nextTaglineIndex(c.index, lines.length),
        prev: c.index,
      }));
    }, TAGLINE_FLIP_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, lines.length]);

  // Reduced motion (or a single line): the first line, static, no interval.
  if (reduceMotion || lines.length < 2) {
    return <span>{lines[0] ?? ""}</span>;
  }

  return (
    <span data-hero-tagline-flip aria-hidden="true">
      {lines.map((line, i) => (
        <motion.span
          key={line}
          data-hero-tagline-line
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
            duration: TAGLINE_FLIP_DURATION_S,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {line}
        </motion.span>
      ))}
    </span>
  );
}
