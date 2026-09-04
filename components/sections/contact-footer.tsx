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
      beat={content.links.map((link) => link.label).join(" · ")}
      heading={content.heading}
      className="journey-station--connect"
    >
      <div className="journey-copy journey-copy--connect">
        <p className="journey-lead text-lg leading-8">{content.message}</p>
        <p className="journey-contact-note">
          Reach me through the utility menu — GitHub, LinkedIn, and resume.
        </p>
      </div>
    </Station>
  );
}
