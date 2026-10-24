import { BubbleMenu } from "@/components/chrome/bubble-menu";
import { LineSidebar } from "@/components/chrome/line-sidebar";
import { MobileChapterRibbon } from "@/components/chrome/mobile-chapter-ribbon";
import { portfolio } from "@/data/content";

/**
 * The site's persistent nav is the line rail (the masthead was deliberately
 * dropped in 8c767a3) — resume.pdf joins it as a pinned utility link so it is
 * reachable from the nav, not only from the FAB's bubble menu.
 */
const resumeLink = portfolio.contact.links.find(
  (link) => "download" in link && link.download === true,
);

export function PortfolioChrome() {
  return (
    <>
      <BubbleMenu links={portfolio.contact.links} />
      <LineSidebar items={portfolio.navigation} resumeHref={resumeLink?.href} />
      <MobileChapterRibbon items={portfolio.navigation} />
    </>
  );
}
