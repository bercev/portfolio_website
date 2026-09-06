"use client";

import { useHydratedReducedMotion } from "@/lib/use-hydrated-reduced-motion";

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
  readonly reduceMotion: boolean;
  readonly label: string;
}) {
  const pills = groups.flatMap((group) =>
    group.items.map((item) => ({ item, category: group.category })),
  );
  const loop = [...pills, ...pills];

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
            aria-hidden={index >= pills.length ? true : undefined}
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
  const reduceMotion = useHydratedReducedMotion();
  const rows = [groups.slice(0, 2), groups.slice(2)] as const;

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
