"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

import { normalizeTech, resolveSkillParam } from "@/lib/skill-work";
import { iconForTech } from "@/lib/tech-icons";

/** Part number for a measuring tape (run-9 iter 23, RUN9-EXP-TAPE):
    `<PREFIX>-01…`, wrapping at the tech count so a duplicated loop copy
    shares the original's rhythm (same wrap as the skill tape's
    skillTapeStaggerIndex). */
export function techTapePartLabel(
  prefix: string,
  index: number,
  count: number,
): string {
  const n = count > 0 ? (index % count) + 1 : 1;
  return `${prefix}-${String(n).padStart(2, "0")}`;
}

/** Part number for the measuring-tape treatment (run-9 iter 23,
    RUN9-EXP-TAPE): EX-01…, wrapping at the tech count so the duplicated
    loop copy shares the original's rhythm (same wrap as the skill tape's
    skillTapeStaggerIndex). */
export function expTapePartLabel(index: number, count: number): string {
  return techTapePartLabel("EX", index, count);
}

/** Tape legend for a row's stack line: `STACK — TAPE 01` for the first
    row of a section, `02`/`03`/… after it (run-9 iter 29, RUN9-TECH-TAPE). */
export function techTapeLegend(index: number): string {
  return `STACK — TAPE ${String(index + 1).padStart(2, "0")}`;
}

/** Pop delay in seconds: 0.1s lead, then 30ms per part (the run-8
    stagger, same as the skill tape). */
export function expTapePopDelay(index: number, count: number): number {
  return 0.1 + (count > 0 ? index % count : 0) * 0.03;
}

export function TechPills({
  technologies,
  marquee = false,
  linkedNames,
  tape = false,
  tapeEntered,
  tapeLegend,
  tapePrefix = "EX",
}: {
  readonly technologies: readonly string[];
  readonly marquee?: boolean;
  /**
   * Ledger skill names (run-3 iter 23, reverse navigation): when
   * provided, a pill resolving to one of these names gets the linked
   * affordance. Marquee rows never pass this — a moving click target
   * is worse than none — so marquee pills stay static labels.
   */
  readonly linkedNames?: readonly string[];
  /**
   * Measuring-tape treatment (run-9 iter 23, RUN9-EXP-TAPE; extended
   * to static rows in iter 29, RUN9-TECH-TAPE): the stack becomes the
   * drawing set's steel tape — bordered strip, tick rules, mono
   * legend, part numerals. With marquee it rides the moving track;
   * without it the strip is static and pops in on first view.
   */
  readonly tape?: boolean;
  /** Latched once the row first enters view — drives the tape entry.
      When the parent does not drive it, the tape latches itself on
      first view (static rows, iter 29). */
  readonly tapeEntered?: boolean;
  /** Legend line above the strip (`STACK — TAPE 01` by default). */
  readonly tapeLegend?: string;
  /** Part-number prefix (`EX` for experience, `PR` for projects). */
  readonly tapePrefix?: string;
}) {
  const loop = marquee ? [...technologies, ...technologies] : technologies;
  // Static tapes latch themselves: each strip pops when its own row
  // scrolls into view (parent-driven tapeEntered still wins when the
  // parent passes it, as the featured marquee row does).
  const tapeRef = useRef<HTMLDivElement | null>(null);
  const tapeInView = useInView(tapeRef, { once: true, amount: 0.3 });
  const [selfEntered, setSelfEntered] = useState(false);
  useEffect(() => {
    if (tapeInView) setSelfEntered(true);
  }, [tapeInView]);
  const entered = tapeEntered ?? selfEntered;

  return (
    <>
      {tape ? (
        <p
          className={marquee ? "exp-tape-legend" : "tech-tape-legend"}
          aria-hidden="true"
        >
          {tapeLegend ?? "STACK — TAPE 01"}
        </p>
      ) : null}
      <div
        ref={tapeRef}
        className={
          marquee
            ? `tech-pills-marquee${tape ? " exp-tape" : ""}${tape && entered ? " exp-tape--in" : ""}`
            : tape
              ? `tech-tape${entered ? " tech-tape--in" : ""}`
              : undefined
        }
      >
        <ul className="tech-pills" aria-label="Stack">
          {loop.map((technology, index) => {
            const icon = iconForTech(technology);
            const linked =
              linkedNames !== undefined &&
              resolveSkillParam(normalizeTech(technology), linkedNames) !==
                null;
            return (
              <li
                key={`${technology}-${index}`}
                className={linked ? "tech-pill tech-pill-linked" : "tech-pill"}
                data-tech={normalizeTech(technology)}
                aria-hidden={
                  marquee && index >= technologies.length ? true : undefined
                }
                style={
                  tape
                    ? { animationDelay: `${expTapePopDelay(index, technologies.length)}s` }
                    : undefined
                }
              >
                {tape ? (
                  <span
                    className={marquee ? "exp-tape-num" : "tech-tape-num"}
                    aria-hidden="true"
                  >
                    {techTapePartLabel(
                      tapePrefix,
                      index,
                      technologies.length,
                    )}
                  </span>
                ) : null}
                {icon ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="tech-pill-icon"
                  >
                    <path fill="currentColor" d={icon.path} />
                  </svg>
                ) : null}
                <span>{technology}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
