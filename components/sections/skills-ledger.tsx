import type { PortfolioContent } from "@/data/content";

import { skillProofHref } from "@/lib/skill-proof";

type SkillsLedgerProps = {
  readonly groups: PortfolioContent["skills"];
};

/**
 * Skills proof ledger (run-2 IDEA, research iter 39): the scannable
 * record under the marquee. The marquee stays as ambient brand motion;
 * this is the surface a hiring manager actually reads — visible category
 * headings (the old ones were sr-only), every skill name, and its proof
 * note as visible text (the old rendering kept notes in title tooltips).
 * Notes that name a chapter link to that chapter; ambiguous notes stay
 * plain text (see skillProofHref). Static text, so the reduced-motion
 * poster is the same record, not a lesser one.
 */
export function SkillsLedger({ groups }: SkillsLedgerProps) {
  return (
    <div className="skills-ledger" aria-label="Skills by category, with proof">
      {groups.map((group) => (
        <section key={group.category} className="skills-ledger-group">
          <h3 className="skills-ledger-heading">{group.category}</h3>
          <ul className="skills-ledger-list">
            {group.items.map((item) => {
              const href = skillProofHref(item.note);
              return (
                <li key={item.name} className="skills-ledger-row">
                  <span className="skills-ledger-name">{item.name}</span>
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
