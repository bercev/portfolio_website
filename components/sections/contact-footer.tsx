import type { PortfolioContent } from "@/data/content";

import { Station } from "@/components/ui/station";

export function ContactFooter({
  content,
}: {
  content: PortfolioContent["contact"];
}) {
  return (
    <Station
      id="contact"
      station={7}
      heading={content.heading}
      className="journey-station--connect"
    >
      <div className="journey-copy journey-copy--connect">
        <p className="journey-lead text-lg leading-8">{content.message}</p>
      </div>
    </Station>
  );
}
