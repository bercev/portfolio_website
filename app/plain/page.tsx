import { ContentFrost } from "@/components/effects/content-frost";
import { PlainBackdrop } from "@/components/effects/plain-backdrop";
import { PortfolioChrome } from "@/components/portfolio/portfolio-chrome";
import { PortfolioMain } from "@/components/portfolio/portfolio-main";

export default function PlainHome() {
  return (
    <div data-plain-root>
      <PlainBackdrop />
      <ContentFrost />
      <PortfolioMain />
      <PortfolioChrome />
    </div>
  );
}
