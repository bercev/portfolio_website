"use client";

import { useEffect, useRef, useState } from "react";

import type { PortfolioContent } from "@/data/content";

import { skillProofHref } from "@/lib/skill-proof";
import {
  normalizeTech,
  resolveSkillParam,
  skillHasWork,
} from "@/lib/skill-work";

type SkillsLedgerProps = {
  readonly groups: PortfolioContent["skills"];
  /** Every experience + project stack, for the exact-match link check. */
  readonly workTech: readonly (readonly string[])[];
};

/**
 * Skills proof ledger (run-2 IDEA, research iter 39): the scannable
 * record under the marquee. The marquee stays as ambient brand motion;
 * this is the surface a hiring manager actually reads — visible category
 * headings (the old ones were sr-only), every skill name, and its proof
 * note as visible text (the old rendering kept notes in title tooltips).
 * Notes that name a project link to that exact row; ambiguous notes stay
 * plain text (see skillProofHref). Static text, so the reduced-motion
 * poster is the same record, not a lesser one.
 *
 * Skill → work highlight (run-3 iter 7): a skill name that exactly
 * matches a work entry's stack is a button. Tapping it highlights the
 * matching experience/project rows and their matching pills and scrolls
 * to the first match — highlight, never filter, so no work is ever
 * hidden from a hiring visitor. Skills with no exact match stay plain
 * text (no dead affordance). The highlight is a static style, so the
 * reduced-motion poster is identical; the scroll is an instant jump,
 * not an animated one.
 */
export function SkillsLedger({ groups, workTech }: SkillsLedgerProps) {
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

  return (
    <div className="skills-ledger" aria-label="Skills by category, with proof">
      <p className="skills-ledger-hint">
        Select a skill to highlight the work that uses it.
      </p>
      {activeSkill !== null ? (
        <p className="skills-ledger-active">
          Highlighting work using <strong>{activeSkill}</strong> —{" "}
          <button
            type="button"
            className="skills-ledger-clear"
            onClick={() => setActiveSkill(null)}
          >
            Clear highlight
          </button>
        </p>
      ) : null}
      {groups.map((group) => (
        <section key={group.category} className="skills-ledger-group">
          <h3 className="skills-ledger-heading">{group.category}</h3>
          <ul className="skills-ledger-list">
            {group.items.map((item) => {
              const href = skillProofHref(item.note);
              const linked = skillHasWork(item.name, workTech);
              return (
                <li key={item.name} className="skills-ledger-row">
                  {linked ? (
                    <button
                      type="button"
                      className="skills-ledger-skill"
                      aria-pressed={activeSkill === item.name}
                      onClick={() =>
                        setActiveSkill((current) =>
                          current === item.name ? null : item.name,
                        )
                      }
                    >
                      {item.name}
                    </button>
                  ) : (
                    <span className="skills-ledger-name">{item.name}</span>
                  )}
                  {href ? (
                    <a className="skills-ledger-note" href={href}>
                      {item.note}
                    </a>
                  ) : (
                    <span className="skills-ledger-note">{item.note}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
