import type { PortfolioContent, Project } from "@/data/content";

import { AsciiSnake } from "@/components/effects/ascii-snake";
import { ExternalLink } from "@/components/ui/external-link";
import { HoverPreview } from "@/components/ui/hover-preview";
import { Station } from "@/components/ui/station";
import { TechPills } from "@/components/ui/tech-pills";

type ProjectsProps = {
  readonly content: PortfolioContent["projects"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

const projectPreviews: Partial<
  Record<Project["title"], { readonly src: string; readonly alt: string }>
> = {
  Vitae: {
    src: "/assets/projects/vitae.png",
    alt: "Vitae landing page: resume version control with Get Started and Why Vitae.",
  },
};

function previewFor(title: Project["title"]) {
  return projectPreviews[title];
}

function ProjectRow({ project }: { readonly project: Project }) {
  const preview = previewFor(project.title);

  return (
    <article className="journey-project-row">
      <div className="journey-project-row-main">
        {project.href && preview ? (
          <HoverPreview
            title={project.title}
            href={project.href}
            image={preview}
            headingClassName="journey-project-row-title"
            linkClassName="decoration-portfolio-accent"
            linkIconSize={26}
            previewClassName="journey-project-preview"
          />
        ) : project.href ? (
          <h3 className="journey-project-row-title">
            <ExternalLink
              href={project.href}
              className="decoration-portfolio-accent"
              iconSize={26}
            >
              {project.title}
            </ExternalLink>
          </h3>
        ) : (
          <h3 className="journey-project-row-title">{project.title}</h3>
        )}
        <p className="journey-project-row-when">{project.dates}</p>
      </div>
      <p className="journey-body journey-project-row-copy">
        {project.description}
      </p>
      <TechPills technologies={project.technologies} />
    </article>
  );
}

function FeaturedProject({ project }: { readonly project: Project }) {
  const preview = previewFor(project.title);

  return (
    <article className="journey-project-featured">
      <p className="journey-project-row-when">{project.dates}</p>
      {project.href && preview ? (
        <HoverPreview
          title={project.title}
          href={project.href}
          image={preview}
          headingClassName="journey-project-featured-title"
          linkClassName="decoration-portfolio-accent"
          linkIconSize={30}
          previewClassName="journey-project-preview"
        />
      ) : project.href ? (
        <h3 className="journey-project-featured-title">
          <ExternalLink
            href={project.href}
            className="decoration-portfolio-accent"
            iconSize={30}
          >
            {project.title}
          </ExternalLink>
        </h3>
      ) : (
        <h3 className="journey-project-featured-title">{project.title}</h3>
      )}
      <p className="journey-body journey-project-featured-copy">
        {project.description}
      </p>
      <TechPills technologies={project.technologies} />
    </article>
  );
}

export function Projects({ content, heading }: ProjectsProps) {
  const [featured, ...rest] = content;

  return (
    <Station
      id="projects"
      heading={heading}
      className="journey-station--ships"
    >
      <div className="journey-project-ledger">
        {featured ? <FeaturedProject project={featured} /> : null}
        {rest.map((project) => (
          <ProjectRow key={project.title} project={project} />
        ))}
      </div>

      {/* Shipped code you can touch: playable ASCII snake. */}
      <AsciiSnake />
    </Station>
  );
}
