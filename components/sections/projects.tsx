import type { PortfolioContent, Project } from "@/data/content";

import { VitaeArtifact } from "@/components/effects/vitae-artifact";
import { VITAE_CASE } from "@/components/effects/vitae-constants";
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
            ? "mt-4 text-2xl font-bold leading-[0.95] tracking-[-0.03em] text-foreground sm:text-3xl"
            : "mt-4 text-3xl font-extrabold leading-[0.95] tracking-[-0.03em] text-foreground sm:text-4xl"
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
      {deepDive ? <span className="journey-tag">Ships product</span> : null}
      {quiet ? <span className="journey-tag journey-tag--quiet">Supporting</span> : null}
      <p
        className={
          quiet
            ? "mt-5 max-w-[65ch] text-base leading-7 text-muted-foreground"
            : "mt-5 max-w-[65ch] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8"
        }
      >
        {project.description}
      </p>
      {deepDive ? (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Vitae outcomes">
          {VITAE_CASE.outcomes.map((outcome) => (
            <li key={outcome} className="vitae-outcome-chip">
              {outcome}
            </li>
          ))}
        </ul>
      ) : null}
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
      kicker="Ships"
      beat={featured ? `${featured.title} ships product` : undefined}
      heading={heading}
    >
      <div className="journey-grid journey-grid--two">
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
            className="journey-panel journey-project journey-project--quiet"
          >
            <ProjectDetails project={supporting} quiet />
          </article>
        ) : null}
      </div>
    </Station>
  );
}
