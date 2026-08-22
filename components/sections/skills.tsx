import type { PortfolioContent } from "@/data/content";

import { SkillsMarquee } from "@/components/effects/skills-marquee";

type SkillsProps = {
  readonly content: PortfolioContent["skills"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Skills({ content, heading }: SkillsProps) {
  return (
    <div
      id="skills"
      role="region"
      aria-label={heading}
      className="relative w-full scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
    >
      <SkillsMarquee skills={content} />
    </div>
  );
}
