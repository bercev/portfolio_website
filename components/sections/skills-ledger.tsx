"use client";

import { useEffect, useRef, useState } from "react";

import type { PortfolioContent } from "@/data/content";

import { skillProofHref } from "@/lib/skill-proof";
import {
  type SkillWorkEntry,
  skillUses,
} from "@/lib/skill-bins";
import {
  normalizeTech,
  resolveSkillParam,
  SKILL_HIGHLIGHT_EVENT,
  skillHasWork,
} from "@/lib/skill-work";

import { seriesKicker, seriesLetter, SkillPlate } from "@/components/sections/skills-plate";

type SkillsLedgerProps = {
  readonly groups: PortfolioContent["skills"];
  /** Every experience + project entry, for the skill links + bin filing. */
  readonly workEntries: readonly SkillWorkEntry[];
};

/**
 * Skills parts catalog (run-9 RUN9-SECTION-IDENTITIES, fourth slice:
 * Skills — the ledger became plates, run-9 iter 6). The scannable record
 * under the marquee is now a grid of bordered spec plates: continuous
 * part numbers (SK-01..), series kickers, proof notes as spec lines, and
 * the same highlight buttons for linked skills. The marquee stays as
 * ambient brand motion; this is the surface a hiring manager actually
 * reads — visible category headings (the old ones were sr-only), every
 * skill name, and its proof note as visible text (the old rendering kept
 * notes in title tooltips).
 *
 * Skill → work highlight (run-3 iter 7): a skill name that exactly
 * matches a work entry's stack is a button. Tapping it highlights the
 * matching experience/project rows and their matching pills and scrolls
 * to the first match — highlight, never filter, so no work is ever
 * hidden from a hiring visitor. Skills with no exact match stay plain
 * text (no dead affordance). The highlight is a static style, so the
 * reduced-motion poster is identical; the scroll is an instant jump,
 * not an animated one. The active plate additionally carries a coachmark
 * border pulse (run-9 iter 6); reduced motion renders it as a static
 * accent border.
 */
export function SkillsLedger({ groups, workEntries }: SkillsLedgerProps) {
  // The stacks, for the exact-match link check (skillHasWork) — derived
  // from the entries so the ledger takes one prop, not two.
  const workTech = workEntries.map((entry) => entry.technologies);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  // True only for the mount-applied param highlight: the highlight
  // effect below skips its scroll once, then resets, so clicks scroll.
  const suppressScrollRef = useRef(false);

  // Deep-linkable highlight (run-3 iter 22, mirroring ?topic=).
  // Mount only, and deliberately NOT a lazy useState initializer:
  // window.location differs at SSR, which would be a hydration mismatch
  // (run-2 iter 43 sign). Read via window.location, not useSearchParams,
  // so no Suspense boundary is needed and SSR output is untouched.
  // Gated on skillHasWork: a plain-text skill has no highlight to
  // activate. Deliberately does NOT scroll — the linker's own #skills
  // hash lands the visitor on the ledger, and the click path's
  // scroll-to-first-match would yank them away from it. A later click
  // overrides the param highlight normally.
  useEffect(() => {
    const names = groups.flatMap((group) =>
      group.items.map((item) => item.name),
    );
    const resolved = resolveSkillParam(
      new URLSearchParams(window.location.search).get("skill"),
      names,
    );
    if (resolved !== null && skillHasWork(resolved, workTech)) {
      suppressScrollRef.current = true;
      setActiveSkill(resolved);
    }
  }, []);

  // Reverse navigation (run-3 iter 23): a linked pill click on a
  // project row dispatches SKILL_HIGHLIGHT_EVENT; the ledger honors it
  // by highlighting that skill and landing the visitor on the ledger —
  // the reverse of the skill→work click path. The highlight effect's
  // scroll-to-first-match is suppressed for this path (the visitor is
  // already travelling TO the ledger), mirroring the ?skill= param's
  // one-shot suppression. The resolve + skillHasWork gates are defense
  // in depth: the row only dispatches linked pills, and this listener
  // ignores anything else rather than rendering it. Focus is
  // deliberately NOT moved: the ledger's own click path scrolls without
  // moving focus, and this path's confirmation is the "Highlighting
  // work using X" line plus the pressed ledger button.
  useEffect(() => {
    const onHighlight = (event: Event) => {
      const detail = (event as CustomEvent<{ skillKey?: unknown }>).detail;
      const key =
        typeof detail?.skillKey === "string" ? detail.skillKey : null;
      const names = groups.flatMap((group) =>
        group.items.map((item) => item.name),
      );
      const resolved = resolveSkillParam(key, names);
      if (resolved !== null && skillHasWork(resolved, workTech)) {
        suppressScrollRef.current = true;
        setActiveSkill(resolved);
        document
          .getElementById("skills")
          ?.scrollIntoView({ behavior: "auto", block: "start" });
      }
    };
    window.addEventListener(SKILL_HIGHLIGHT_EVENT, onHighlight);
    return () => window.removeEventListener(SKILL_HIGHLIGHT_EVENT, onHighlight);
  }, []);

  useEffect(() => {
    const key = activeSkill === null ? null : normalizeTech(activeSkill);
    document.querySelectorAll("[data-work-tech]").forEach((row) => {
      const keys = (row.getAttribute("data-work-tech") ?? "").split("|");
      const match = key !== null && keys.includes(key);
      row.classList.toggle("is-skill-match", match);
      row.querySelectorAll("[data-tech]").forEach((pill) => {
        pill.classList.toggle(
          "is-skill-match-pill",
          match && pill.getAttribute("data-tech") === key,
        );
      });
    });
    if (key !== null) {
      // Consume the one-shot param suppression here, not
      // unconditionally: on the mount commit key is null and the param
      // effect has only just set the flag, so an unconditional reset
      // would clear it before the highlight's effect ever sees it.
      if (suppressScrollRef.current) {
        suppressScrollRef.current = false;
      } else {
        const first = document.querySelector(
          "[data-work-tech].is-skill-match",
        );
        if (first) {
          const top = first.getBoundingClientRect().top + window.scrollY - 96;
          window.scrollTo({ top, behavior: "auto" });
        }
      }
    }
  }, [activeSkill]);

  // Continuous part numbers (SK-01..) across the whole catalog: each
  // series starts where the previous one ended.
  let plateCursor = 0;
  const series = groups.map((group) => {
    const start = plateCursor;
    plateCursor += group.items.length;
    return { group, start };
  });

  return (
    <div className="skills-catalog" aria-label="Skills by category, with proof">
      <p className="skills-catalog-hint">
        Select a skill to highlight the work that uses it. A dashed bin is
        proved by its note, not by a stack.
      </p>
      {activeSkill !== null ? (
        <p className="skills-catalog-active">
          Highlighting work using <strong>{activeSkill}</strong> —{" "}
          <button
            type="button"
            className="skills-catalog-clear"
            onClick={() => setActiveSkill(null)}
          >
            Clear highlight
          </button>
        </p>
      ) : null}
      {series.map(({ group, start }, groupIndex) => (
        <section key={group.category} className="skills-catalog-series">
          <div className="skills-series-head">
            <div>
              <p className="skills-series-kicker" aria-hidden="true">
                {seriesKicker(groupIndex, group.items.length)}
              </p>
              <h3 className="skills-series-heading">{group.category}</h3>
            </div>
            <span aria-hidden="true" className="skills-series-letter">
              {seriesLetter(groupIndex)}
            </span>
          </div>
          <ul className="skills-plates">
            {group.items.map((item, itemIndex) => {
              const href = skillProofHref(item.note);
              const linked = skillHasWork(item.name, workTech);
              return (
                <SkillPlate
                  key={item.name}
                  index={start + itemIndex}
                  name={item.name}
                  note={item.note}
                  noteHref={href}
                  linked={linked}
                  active={activeSkill === item.name}
                  uses={skillUses(item.name, workEntries)}
                  onToggle={() =>
                    setActiveSkill((current) =>
                      current === item.name ? null : item.name,
                    )
                  }
                />
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
