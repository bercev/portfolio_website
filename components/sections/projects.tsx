import type { PortfolioContent } from "@/data/content";

import { ExternalLink } from "@/components/ui/external-link";
import { PortfolioCard } from "@/components/ui/portfolio-card";
import { SectionHeading } from "@/components/ui/section-heading";

type ProjectsProps = {
  readonly content: PortfolioContent["projects"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Projects({ content, heading }: ProjectsProps) {
  return (
    <section
      id="projects"
      aria-label={heading}
      className="relative scroll-mt-[calc(4rem+env(safe-area-inset-top))] py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={heading} />

        <div className="mt-12 grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:mt-16 lg:gap-7">
          {content.map((project, index) => (
            <PortfolioCard
              key={project.title}
              className={index % 2 === 1 ? "md:mt-14" : undefined}
            >
              <article className="flex h-full flex-col">
                <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <h3
                    aria-label={project.title}
                    className="font-serif text-3xl leading-none tracking-[-0.025em] text-foreground sm:text-4xl"
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
                  <p className="shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")} — {project.dates}
                  </p>
                </header>

                <p className="mt-5 flex-1 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                  {project.description}
                </p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {project.technologies.map((technology) => (
                    <li
                      key={technology}
                      className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground"
                    >
                      {technology}
                    </li>
                  ))}
                </ul>
              </article>
            </PortfolioCard>
          ))}
        </div>
      </div>
    </section>
  );
}
