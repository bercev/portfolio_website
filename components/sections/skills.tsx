import type { PortfolioContent } from "@/data/content";

import { Station } from "@/components/ui/station";

type SkillsProps = {
  readonly content: PortfolioContent["skills"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Skills({ content, heading }: SkillsProps) {
  const beat = content.map((category) => category.category).join(" · ");

  return (
    <Station
      id="skills"
      station={6}
      beat={beat}
      heading={heading}
      className="journey-station--vocab"
    >
      <div className="journey-skill-clusters">
        {content.map((category) => (
          <div
            key={category.category}
            data-skill-cluster
            className="journey-skill-group"
          >
            <h3 className="journey-skill-heading">{category.category}</h3>
            <p className="journey-skill-line">
              {category.items.map((item) => (
                <span key={item} data-skill className="journey-skill">
                  {item}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
    </Station>
  );
}
