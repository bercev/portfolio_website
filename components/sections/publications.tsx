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
      <div className="journey-panel journey-panel--ruled">
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
            <div className="journey-pub-layout">
              <div className="journey-pub-main">
                <HoverPreview
                  title={publication.title}
                  href={publication.href}
                  pdfUrl={publication.pdfUrl}
                  headingClassName={
                    index === 0
                      ? "journey-pub-title journey-pub-title--lead"
                      : "journey-pub-title"
                  }
                  linkClassName="w-full items-start gap-2 decoration-portfolio-accent"
                  linkIconSize={24}
                  previewClassName={
                    index === 0
                      ? "journey-pub-preview journey-pub-preview--lead"
                      : "journey-pub-preview"
                  }
                />
                <span className="journey-mark">
                  {index === 0 ? "Published proof" : "Research paper"}
                </span>
              </div>
              <aside
                className="journey-pub-marginalia"
                aria-label="Venue and date"
              >
                <span className="journey-pub-venue">{publication.venue}</span>
                <span className="journey-pub-date">{publication.date}</span>
              </aside>
            </div>
          </article>
        ))}
      </div>
    </Station>
  );
}
