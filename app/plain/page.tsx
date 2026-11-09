import { ContentFrost } from "@/components/effects/content-frost";
import { PlainBackdrop } from "@/components/effects/plain-backdrop";
import { PortfolioChrome } from "@/components/portfolio/portfolio-chrome";
import { PortfolioMain } from "@/components/portfolio/portfolio-main";

export default function PlainHome() {
  return (
    <div data-plain-root>
      <PlainBackdrop />
      <ContentFrost />
      {/* Print-edition masthead (run-9 RUN9-ROUTES): /plain is the print
          edition of the site, so it opens with its own sheet-head strip —
          the in-flow marker that makes the route read as a different
          edition at a glance, with no fixed overlay to collide with copy. */}
      <header className="plain-edition-strip" data-plain-edition>
        <span>Print edition — No motion</span>
        <span>All sections · Scale 1:1</span>
      </header>
      <PortfolioMain />
      <PortfolioChrome />
    </div>
  );
}
