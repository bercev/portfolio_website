import type { PortfolioContent } from "@/data/content";

import { HoverPreview } from "@/components/ui/hover-preview";
import { Station } from "@/components/ui/station";

type PublicationsProps = {
  readonly content: PortfolioContent["publications"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

function proofLabel(title: string) {
  if (title.startsWith("SkillOptimizer")) return "SkillOptimizer";
  if (title.startsWith("@GrokSet")) return "@GrokSet";
  return title.split(":")[0]?.trim() || title;
}

export function Publications({ content, heading }: PublicationsProps) {
  const beat = content.map((paper) => proofLabel(paper.title)).join(" · ");

  return (
    <Station
      id="publications"
      station={3}
      kicker="Proof"
      beat={beat}
      heading={heading}
      className="journey-station--proof"
    >
      <div className="journey-panel journey-panel--proof">
        {content.map((publication, index) => (
          <article
            key={publication.href}
            data-publication-row
            data-publication-lead={index === 0 ? "true" : undefined}
            className={
              index === 0
                ? "journey-pub-row journey-pub-row--lead"
                : "journey-pub-row"
            }
          >
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {publication.venue}
              <span aria-hidden="true"> / </span>
              {publication.date}
            </p>
            <HoverPreview
              title={publication.title}
              href={publication.href}
              pdfUrl={publication.pdfUrl}
              headingClassName={
                index === 0
                  ? "mt-4 w-full max-w-[40ch] text-3xl font-extrabold leading-[1.02] tracking-[-0.03em] text-foreground sm:text-4xl"
                  : "mt-4 w-full max-w-[36ch] text-2xl font-bold leading-[1.05] tracking-[-0.025em] text-foreground sm:text-3xl"
              }
              linkClassName="w-full items-start gap-2 decoration-portfolio-accent"
              linkIconSize={24}
            />
            <span className="journey-tag journey-tag--proof">
              {index === 0 ? "Proof" : "Research paper"}
            </span>
          </article>
        ))}
      </div>
    </Station>
  );
}
