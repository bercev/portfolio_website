import type { PortfolioContent } from "@/data/content";

import { SkillMarquee } from "@/components/effects/skill-marquee";
import { Station } from "@/components/ui/station";

type SkillsProps = {
  readonly content: PortfolioContent["skills"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Skills({ content, heading }: SkillsProps) {
  return (
    <Station
      id="skills"
      station={6}
      heading={heading}
      className="journey-station--vocab"
    >
      {content.map((category) => (
        <h3 key={category.category} className="sr-only">
          {category.category}
        </h3>
      ))}
      <SkillMarquee groups={content} />
    </Station>
  );
}
