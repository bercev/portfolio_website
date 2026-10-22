import type { PortfolioContent } from "@/data/content";

import { AsciiSnake } from "@/components/effects/ascii-snake";
import { Station } from "@/components/ui/station";
import { CaseStudyRow } from "@/components/sections/project-case-study";

type ProjectsProps = {
  readonly content: PortfolioContent["projects"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Projects({ content, heading }: ProjectsProps) {
  const [featured, ...rest] = content;

  return (
    <Station
      id="projects"
      heading={heading}
      className="journey-station--ships"
    >
      <div className="journey-project-ledger">
        {featured ? <CaseStudyRow project={featured} featured /> : null}
        {rest.map((project) => (
          <CaseStudyRow key={project.title} project={project} />
        ))}
      </div>

      {/* Shipped code you can touch: playable ASCII snake. */}
      <AsciiSnake />
    </Station>
  );
}
