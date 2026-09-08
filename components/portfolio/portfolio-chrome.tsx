import { BubbleMenu } from "@/components/chrome/bubble-menu";
import { LineSidebar } from "@/components/chrome/line-sidebar";
import { portfolio } from "@/data/content";

export function PortfolioChrome() {
  return (
    <>
      <BubbleMenu links={portfolio.contact.links} />
      <LineSidebar items={portfolio.navigation} />
    </>
  );
}
