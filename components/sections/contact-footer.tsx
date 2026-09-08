import type { PortfolioContent } from "@/data/content";

import { MotionVersionLink } from "@/components/chrome/motion-version-link";
import { ExternalLink } from "@/components/ui/external-link";
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
      <div className="journey-col-main journey-copy journey-copy--connect">
        <p className="journey-lead text-lg leading-8">{content.message}</p>
      </div>

      <nav className="journey-col-rail journey-spec" aria-label="Contact links">
        <p className="journey-spec-label">Elsewhere</p>
        <ul className="journey-contact-list">
          {content.links.map((link) => (
            <li key={link.href}>
              <ExternalLink
                href={link.href}
                download={link.download}
                className="journey-contact-link"
              >
                {link.label}
              </ExternalLink>
            </li>
          ))}
          <li>
            <MotionVersionLink className="journey-contact-link" />
          </li>
        </ul>
      </nav>
    </Station>
  );
}
