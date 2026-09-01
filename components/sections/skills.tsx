import type { PortfolioContent } from "@/data/content";

import { Station } from "@/components/ui/station";

type SkillsProps = {
  readonly content: PortfolioContent["skills"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Skills({ content, heading }: SkillsProps) {
  return (
    <Station id="skills" station={6} kicker="Toolkit" heading={heading}>
      <div className="journey-panel">
        {content.map((category) => (
          <div key={category.category} className="journey-skill-group mb-9 last:mb-0">
            <h3 className="journey-skill-heading">{category.category}</h3>
            <div>
              {category.items.map((item) => (
                <span key={item} data-skill className="journey-skill">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Station>
  );
}
