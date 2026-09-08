import type { PortfolioContent, Project } from "@/data/content";

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

function ProjectDetails({ project }: { readonly project: Project }) {
  const preview = previewFor(project.title);

  return (
    <>
      <p className="journey-project-when">{project.dates}</p>
      {project.href && preview ? (
        <HoverPreview
          title={project.title}
          href={project.href}
          image={preview}
          headingClassName="journey-project-title"
          linkClassName="decoration-portfolio-accent"
          linkIconSize={22}
          previewClassName="journey-project-preview"
        />
      ) : project.href ? (
        <h3 className="journey-project-title">
          <ExternalLink
            href={project.href}
            className="decoration-portfolio-accent"
            iconSize={22}
          >
            {project.title}
          </ExternalLink>
        </h3>
      ) : (
        <h3 className="journey-project-title">{project.title}</h3>
      )}
      <p className="journey-body journey-project-copy">{project.description}</p>
      <div className="mt-auto pt-5">
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
            className="journey-panel journey-project"
          >
            <ProjectDetails project={featured} />
          </article>
        ) : null}

        {supporting ? (
          <article
            data-project-supporting
            className="journey-panel journey-project"
          >
            <ProjectDetails project={supporting} />
          </article>
        ) : null}
      </div>
    </Station>
  );
}
