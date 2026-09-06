"use client";

import { useReducedMotion } from "motion/react";

type SkillGroup = {
  readonly category: string;
  readonly items: readonly string[];
};

function SkillRow({
  groups,
  direction,
  reduceMotion,
  label,
}: {
  readonly groups: readonly SkillGroup[];
  readonly direction: "forward" | "reverse";
  readonly reduceMotion: boolean | null;
  readonly label: string;
}) {
  const pills = groups.flatMap((group) =>
    group.items.map((item) => ({ item, category: group.category })),
  );
  const loop = reduceMotion ? pills : [...pills, ...pills];

  if (pills.length === 0) {
    return null;
  }

  return (
    <div
      data-skills-row
      data-direction={direction}
      tabIndex={0}
      className={
        reduceMotion ? "skill-marquee skill-marquee--static" : "skill-marquee"
      }
    >
      <ul className="skill-marquee-track" aria-label={label}>
        {loop.map((pill, index) => (
          <li
            key={`${pill.item}-${index}`}
            data-skill
            className="skill-pill"
            title={pill.category}
            aria-hidden={reduceMotion ? undefined : index >= pills.length}
          >
            {pill.item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SkillMarquee({
  groups,
}: {
  readonly groups: readonly SkillGroup[];
}) {
  const reduceMotion = useReducedMotion();
  const rows = reduceMotion
    ? ([groups.slice(0, 2), groups.slice(2)] as const)
    : ([groups, groups] as const);

  return (
    <div className="skill-marquee-stack" data-skill-cluster>
      {rows.map((rowGroups, index) => (
        <SkillRow
          key={`${index}-${rowGroups.map((group) => group.category).join("-")}`}
          groups={rowGroups}
          direction={index === 0 ? "forward" : "reverse"}
          reduceMotion={reduceMotion}
          label={index === 0 ? "Skills" : "More skills"}
        />
      ))}
    </div>
  );
}
