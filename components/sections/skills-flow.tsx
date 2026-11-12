/**
 * Light-flow cells for the skills section (run-10 RUN10-SKILLS).
 *
 * The run-9 parts catalog is de-drafted: no bordered spec plates, no
 * part numbers (SK-01..), no SERIES kickers, no bin-row letters, no
 * registration "+" marks, no dashed loose bins. Each skill is a
 * borderless light cell — a glow dot + flow number ("01 / 18") over a
 * fading light line, the name, its proof note as the line under it,
 * and the USED-IN rail of work entries that list the skill (one glow
 * node per entry). A skill filed under >=2 work entries spans two
 * columns; a skill no stack lists is a quiet cell — a fainter line,
 * proved by its note, not by a stack. The rhythm still comes from
 * real usage depth (lib/skill-bins.ts), never decoration.
 *
 * The cells rise in on first scroll into view — a small fade + rise,
 * staggered 45ms across each visual row (reel-4 ~30ms row stagger,
 * rounded up for the slower headless clock). No rotate: light settles,
 * it doesn't deal. The active cell carries a breathing glow ring
 * (60fps.design: Revolut RevPoints coachmark border pulse, read
 * 2026-11-09) so the highlight is visible without hunting for the
 * accent name. Reduced motion: static cells, settled ring, no rise
 * (native hook — motion's useReducedMotion() is unreliable in this app,
 * run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { flowLabels } from "@/lib/plate-labels";
import { skillBinKind, skillBinSpan } from "@/lib/skill-bins";

import { SparkleBurst } from "./sparkle-burst";

/** Series kicker: "01 / 04 · 7 SKILLS" — flow number + item count. */
export function seriesKicker(
  groupIndex: number,
  itemCount: number,
  seriesTotal: number,
) {
  const noun = itemCount === 1 ? "SKILL" : "SKILLS";
  return `${flowLabels(groupIndex, seriesTotal).plate} · ${itemCount} ${noun}`;
}

/**
 * Rise stagger: 45ms per cell across each visual row of three.
 * Wraps per row so a reflowed 1-column mobile stack still reads
 * as a cascade, not one long queue.
 */
export function flowDelay(index: number) {
  return (index % 3) * 0.045;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const RISE_DURATION = 0.45;

export function SkillFlow({
  index,
  total,
  name,
  note,
  noteHref,
  linked,
  active,
  onToggle,
  uses,
}: {
  /** Continuous flow number (0-based) across the whole field. */
  readonly index: number;
  /** Total skills in the field, for the "01 / 18" label. */
  readonly total: number;
  readonly name: string;
  readonly note: string;
  /** Proof-note link, when the note names a project (skillProofHref). */
  readonly noteHref: string | null;
  /** True when the skill exactly matches a work stack (highlightable). */
  readonly linked: boolean;
  readonly active: boolean;
  readonly onToggle: () => void;
  /** Work-entry names whose stack lists the skill (lib/skill-bins.ts). */
  readonly uses: readonly string[];
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = usePrefersReducedMotion();
  // RUN10-SPARKLE: every hover-enter / focus / tap replays the light
  // burst from the cell's top-right corner. A counter, not a boolean
  // — the burst re-mounts (and replays) on each increment.
  const [sparkle, setSparkle] = useState(0);
  const fireSparkle = () => {
    setSparkle((count) => count + 1);
  };
  const settled = inView || reduceMotion;
  // A skill filed under >=2 entries spans two columns; a skill no
  // stack lists is a quiet cell — the grid rhythm comes from real
  // usage depth.
  const wide = skillBinSpan(uses.length) === 2;
  const quiet = skillBinKind(uses.length) === "loose";

  return (
    <motion.li
      ref={ref}
      data-skill-flow
      data-skill-kind={quiet ? "quiet" : "filed"}
      onMouseEnter={fireSparkle}
      className={[
        "skill-flow",
        active ? "skill-flow--active" : "",
        wide ? "skill-flow--wide" : "",
        quiet ? "skill-flow--quiet" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      // Key the rise to inView, not to mount: an opacity target of 1 in
      // the pre-entry branch would animate to settled while the cell is
      // still below the fold (same class of bug as the iter-3 pen trace).
      // Under reduced motion the cell renders settled from the first frame.
      initial={
        reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
      }
      animate={settled ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: RISE_DURATION, delay: flowDelay(index), ease: SITE_EASE }
      }
    >
      <p className="skill-flow-head">
        <span className="skill-flow-index">
          <span aria-hidden="true" className="skill-flow-dot" />
          {flowLabels(index, total).plate}
        </span>
      </p>
      {linked ? (
        <button
          type="button"
          className="skill-flow-skill"
          aria-pressed={active}
          onClick={() => {
            onToggle();
            fireSparkle();
          }}
          onFocus={fireSparkle}
        >
          {name}
        </button>
      ) : (
        <span className="skill-flow-name">{name}</span>
      )}
      {noteHref ? (
        <a className="skill-flow-note" href={noteHref}>
          {note}
        </a>
      ) : (
        <span className="skill-flow-note">{note}</span>
      )}
      {uses.length > 0 ? (
        <p className="skill-flow-rail">
          <span className="skill-flow-rail-label">USED IN</span>
          {uses.map((use) => (
            <span key={use} className="skill-flow-use">
              <span aria-hidden="true" className="skill-flow-dot" />
              {use}
            </span>
          ))}
        </p>
      ) : null}
      {/* RUN10-SPARKLE: the burst fires from the cell's top-right
          corner — the cell is position: relative, so the zero-size
          layer anchors there and the particles spill past the edge. */}
      <SparkleBurst burst={sparkle} />
    </motion.li>
  );
}
