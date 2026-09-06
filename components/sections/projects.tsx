import type { PortfolioContent, Project } from "@/data/content";

import { ExternalLink } from "@/components/ui/external-link";
import { Station } from "@/components/ui/station";
import { TechPills } from "@/components/ui/tech-pills";

type ProjectsProps = {
  readonly content: PortfolioContent["projects"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

function ProjectDetails({
  project,
  quiet = false,
}: {
  readonly project: Project;
  readonly quiet?: boolean;
}) {
  return (
    <>
      <p className="journey-project-when">{project.dates}</p>
      <h3
        aria-label={project.title}
        className={
          quiet
            ? "journey-project-title journey-project-title--quiet"
            : "journey-project-title journey-project-title--ships"
        }
      >
        {project.href ? (
          <ExternalLink
            href={project.href}
            className="decoration-portfolio-accent"
          >
            {project.title}
          </ExternalLink>
        ) : (
          project.title
        )}
      </h3>
      <p
        className={
          quiet
            ? "journey-body mt-5 max-w-[58ch] text-base leading-7 text-muted-foreground"
            : "journey-body mt-5 max-w-[65ch] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8"
        }
      >
        {project.description}
      </p>
      <div className="mt-5">
        <TechPills technologies={project.technologies} />
      </div>
    </>
  );
}

export function Projects({ content, heading }: ProjectsProps) {
  const [featured, supporting] = content;

  return (
    <Station
      id="projects"
      station={5}
      heading={heading}
      className="journey-station--ships"
    >
      <div className="journey-grid journey-grid--ships">
        {featured ? (
          <article
            data-project-featured
            className="journey-panel journey-project journey-project--ships liquid-glass"
          >
            <ProjectDetails project={featured} />
          </article>
        ) : null}

        {supporting ? (
          <article
            data-project-supporting
            className="journey-panel journey-panel--strip journey-project journey-project--quiet"
          >
            <ProjectDetails project={supporting} quiet />
          </article>
        ) : null}
      </div>
    </Station>
  );
}
