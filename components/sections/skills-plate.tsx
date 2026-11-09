/**
 * Parts-catalog plates for the skills section (run-9 RUN9-SECTION-IDENTITIES,
 * fourth slice: Skills).
 *
 * Skills stop being hairline ledger rows and become a parts catalog: each
 * skill is a bordered spec plate with a continuous part number (SK-01..),
 * its proof note as the spec line, and the same highlight button for linked
 * skills. Categories are series (SERIES A–D) with an item count. The plates
 * deal in like a deck on first scroll into view — a small rotate + rise,
 * staggered across each visual row — and the active plate carries a
 * coachmark border pulse (60fps.design: Revolut RevPoints coachmark border
 * pulse, read 2026-11-09) so the highlight is visible without hunting for
 * the accent name. Reduced motion: static plates, settled border, no pulse
 * (native hook — motion's useReducedMotion() is unreliable in this app,
 * run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Continuous part number across the whole catalog: "SK-01". */
export function plateIndex(index: number) {
  return `SK-${String(index + 1).padStart(2, "0")}`;
}

/** Series letter per category, in content order: "A". */
export function seriesLetter(groupIndex: number) {
  return String.fromCharCode("A".charCodeAt(0) + groupIndex);
}

/** Series kicker: "SERIES A · 7 ITEMS". */
export function seriesKicker(groupIndex: number, itemCount: number) {
  const noun = itemCount === 1 ? "ITEM" : "ITEMS";
  return `SERIES ${seriesLetter(groupIndex)} · ${itemCount} ${noun}`;
}

/**
 * Deal-in stagger: 45ms per plate across each visual row of three
 * (reel-4 rule: ~30ms row stagger, rounded up for the slower headless
 * clock). Wraps per row so a reflowed 1-column mobile stack still reads
 * as a cascade, not one long queue.
 */
export function dealDelay(index: number) {
  return (index % 3) * 0.045;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const DEAL_DURATION = 0.45;

export function SkillPlate({
  index,
  name,
  note,
  noteHref,
  linked,
  active,
  onToggle,
}: {
  /** Continuous plate number (0-based) across the catalog. */
  readonly index: number;
  readonly name: string;
  readonly note: string;
  /** Proof-note link, when the note names a project (skillProofHref). */
  readonly noteHref: string | null;
  /** True when the skill exactly matches a work stack (highlightable). */
  readonly linked: boolean;
  readonly active: boolean;
  readonly onToggle: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = usePrefersReducedMotion();
  const settled = inView || reduceMotion;

  return (
    <motion.li
      ref={ref}
      data-skill-plate
      className={
        active ? "skills-plate skills-plate--active" : "skills-plate"
      }
      // Key the deal to inView, not to mount: an opacity target of 1 in
      // the pre-entry branch would animate to settled while the plate is
      // still below the fold (same class of bug as the iter-3 pen trace).
      // Under reduced motion the plate renders settled from the first frame.
      initial={
        reduceMotion ? { opacity: 1, y: 0, rotate: 0 } : { opacity: 0, y: 16, rotate: -1.5 }
      }
      animate={
        settled
          ? { opacity: 1, y: 0, rotate: 0 }
          : { opacity: 0, y: 16, rotate: -1.5 }
      }
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: DEAL_DURATION, delay: dealDelay(index), ease: SITE_EASE }
      }
    >
      <p className="skills-plate-head">
        <span className="skills-plate-index">{plateIndex(index)}</span>
        <span aria-hidden="true" className="skills-plate-mark">
          +
        </span>
      </p>
      {linked ? (
        <button
          type="button"
          className="skills-plate-skill"
          aria-pressed={active}
          onClick={onToggle}
        >
          {name}
        </button>
      ) : (
        <span className="skills-plate-name">{name}</span>
      )}
      {noteHref ? (
        <a className="skills-plate-note" href={noteHref}>
          {note}
        </a>
      ) : (
        <span className="skills-plate-note">{note}</span>
      )}
    </motion.li>
  );
}
