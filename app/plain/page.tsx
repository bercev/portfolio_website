import { ContentFrost } from "@/components/effects/content-frost";
import { PlainBackdrop } from "@/components/effects/plain-backdrop";
import { PortfolioChrome } from "@/components/portfolio/portfolio-chrome";
import { PortfolioMain } from "@/components/portfolio/portfolio-main";

export default function PlainHome() {
  return (
    <div data-plain-root>
      <PlainBackdrop />
      <ContentFrost />
      {/* Light-edition masthead (run-10 RUN10-PLAIN): /plain is the
          still-light edition of the site, so it opens with its own strip —
          the in-flow marker that makes the route read as a different
          edition at a glance, with no fixed overlay to collide with copy.
          No "print", no scale — the edition is light, not paper. */}
      <header className="plain-edition-strip" data-plain-edition>
        <span>Light edition — No motion</span>
        <span>All sections · Still light</span>
      </header>
      <PortfolioMain />
      <PortfolioChrome />
    </div>
  );
}
