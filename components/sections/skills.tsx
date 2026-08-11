import type { PortfolioContent } from "@/data/content";

import { SkillsMarquee } from "@/components/effects/skills-marquee";
import { SectionHeading } from "@/components/ui/section-heading";

type SkillsProps = {
  readonly content: PortfolioContent["skills"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Skills({ content, heading }: SkillsProps) {
  return (
    <section
      id="skills"
      aria-label={heading}
      className="relative scroll-mt-[calc(4rem+env(safe-area-inset-top))] py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={heading} />
        <div className="mt-10 lg:mt-14">
          <SkillsMarquee skills={content} />
        </div>
      </div>
    </section>
  );
}
