"use client";

import { useReducedMotion } from "motion/react";

type SkillGroup = {
  readonly category: string;
  readonly items: readonly string[];
};

export function SkillMarquee({ groups }: { readonly groups: readonly SkillGroup[] }) {
  const reduceMotion = useReducedMotion();
  const pills = groups.flatMap((group) =>
    group.items.map((item) => ({ item, category: group.category })),
  );
  const loop = reduceMotion ? pills : [...pills, ...pills];

  return (
    <div
      className={
        reduceMotion ? "skill-marquee skill-marquee--static" : "skill-marquee"
      }
      data-skill-cluster
    >
      <ul className="skill-marquee-track" aria-label="Skills">
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
