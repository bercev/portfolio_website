import type { PortfolioContent } from "@/data/content";

import { HoverPreview } from "@/components/ui/hover-preview";
import { Station } from "@/components/ui/station";

type PublicationsProps = {
  readonly content: PortfolioContent["publications"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Publications({ content, heading }: PublicationsProps) {
  return (
    <Station
      id="publications"
      station={3}
      heading={heading}
      className="journey-station--proof"
    >
      <div className="journey-pub-list journey-ledger">
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
            <p className="journey-pub-index" aria-hidden="true">
              {index + 1}
            </p>
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
                linkClassName="decoration-portfolio-accent"
                linkIconSize={24}
                previewClassName="journey-pub-preview"
              />
              <p className="journey-pub-gloss">{publication.gloss}</p>
            </div>
            <aside
              className="journey-pub-marginalia"
              aria-label="Venue and date"
            >
              <span className="journey-pub-venue">{publication.venue}</span>
              <span className="journey-pub-date">{publication.date}</span>
            </aside>
          </article>
        ))}
      </div>
    </Station>
  );
}
