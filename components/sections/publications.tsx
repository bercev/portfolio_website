import type { PortfolioContent } from "@/data/content";

import { HoverPreview } from "@/components/ui/hover-preview";
import { Station } from "@/components/ui/station";

type PublicationsProps = {
  readonly content: PortfolioContent["publications"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Publications({ content, heading }: PublicationsProps) {
  return (
    <Station id="publications" station={3} kicker="Papers" heading={heading}>
      <div className="journey-panel">
        {content.map((publication) => (
          <article
            key={publication.href}
            data-publication-row
            className="journey-pub-row"
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
              headingClassName="mt-4 w-full max-w-[36ch] text-2xl font-bold leading-[1.05] tracking-[-0.025em] text-foreground sm:text-3xl"
              linkClassName="w-full items-start gap-2 decoration-portfolio-accent"
              linkIconSize={24}
            />
            <span className="journey-tag">Research Paper</span>
          </article>
        ))}
      </div>
    </Station>
  );
}
