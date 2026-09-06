import type { PortfolioContent, Project } from "@/data/content";

import { HoverPreview } from "@/components/ui/hover-preview";
import { Station } from "@/components/ui/station";
import { TechPills } from "@/components/ui/tech-pills";

type ProjectsProps = {
  readonly content: PortfolioContent["projects"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

const projectPreviews = {
  Vitae: {
    src: "/assets/projects/vitae.svg",
    alt: "Placeholder studio shot of Vitae: stacked resume revisions beside a typeset page.",
  },
  "AI Discord Chatbot": {
    src: "/assets/projects/discord-chatbot.svg",
    alt: "Placeholder studio shot of the Discord bot: a night channel with a bot reply in the thread.",
  },
} as const satisfies Record<
  Project["title"],
  { readonly src: string; readonly alt: string }
>;

function previewFor(title: Project["title"]) {
  if (title === "Vitae" || title === "AI Discord Chatbot") {
    return projectPreviews[title];
  }

  return undefined;
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
