import type { PortfolioContent, Project } from "@/data/content";

import { VitaeArtifact } from "@/components/effects/vitae-artifact";
import { ExternalLink } from "@/components/ui/external-link";
import { Station } from "@/components/ui/station";

type ProjectsProps = {
  readonly content: PortfolioContent["projects"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

function ProjectDetails({
  project,
  deepDive = false,
  quiet = false,
}: {
  readonly project: Project;
  readonly deepDive?: boolean;
  readonly quiet?: boolean;
}) {
  return (
    <>
      <p className="text-base font-semibold text-muted-foreground">
        {project.dates}
      </p>
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
      <p className="mt-5 text-base leading-7 text-muted-foreground">
        <span className="font-semibold text-foreground">Built with: </span>
        {project.technologies.join(", ")}
      </p>
      {deepDive ? (
        <div className="mt-8">
          <VitaeArtifact project={project} />
        </div>
      ) : null}
    </>
  );
}

export function Projects({ content, heading }: ProjectsProps) {
  const [featured, supporting] = content;

  return (
    <Station
      id="projects"
      station={5}
      beat={
        featured
          ? `${featured.title} — versioned resumes that ship`
          : undefined
      }
      heading={heading}
      className="journey-station--ships"
    >
      <div className="journey-grid journey-grid--ships">
        {featured ? (
          <article
            data-project-featured
            className="journey-panel journey-project journey-project--ships liquid-glass"
          >
            <ProjectDetails project={featured} deepDive />
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
