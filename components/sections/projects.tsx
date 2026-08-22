import type { PortfolioContent, Project } from "@/data/content";

import { ExternalLink } from "@/components/ui/external-link";
import { CircularGallery } from "@/components/ui/circular-gallery";
import { PortfolioCard } from "@/components/ui/portfolio-card";
import { SectionHeading } from "@/components/ui/section-heading";

type ProjectsProps = {
  readonly content: PortfolioContent["projects"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

function ProjectDetails({ project }: { readonly project: Project }) {
  return (
    <>
      <p className="text-base font-semibold text-muted-foreground">
        {project.dates}
      </p>
      <h3
        aria-label={project.title}
        className="mt-4 text-4xl font-extrabold leading-[0.95] tracking-[-0.03em] text-foreground sm:text-5xl"
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
      <p className="mt-6 max-w-[65ch] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
        {project.description}
      </p>
      <p className="mt-6 text-base leading-7 text-muted-foreground">
        <span className="font-semibold text-foreground">Built with: </span>
        {project.technologies.join(", ")}
      </p>
    </>
  );
}

export function Projects({ content, heading }: ProjectsProps) {
  return (
    <section
      id="projects"
      aria-label={heading}
      className="relative scroll-mt-[calc(4rem+env(safe-area-inset-top))] py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={heading} />

        <div className="mt-12 lg:mt-16">
          <CircularGallery
            ariaLabel={`${heading} carousel`}
            items={content.map((project, index) => ({
              id: project.href ?? project.title,
              label: project.title,
              content: (
                <PortfolioCard>
                  <article
                    data-project-featured={index === 0 ? "" : undefined}
                    data-project-supporting={index === 1 ? "" : undefined}
                  >
                    <ProjectDetails project={project} />
                  </article>
                </PortfolioCard>
              ),
            }))}
          />
        </div>
      </div>
    </section>
  );
}
