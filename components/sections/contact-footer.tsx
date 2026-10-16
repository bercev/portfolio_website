import type { PortfolioContent } from "@/data/content";

import { MotionVersionLink } from "@/components/chrome/motion-version-link";
import { Terminal } from "@/components/terminal/Terminal";
import { ExternalLink } from "@/components/ui/external-link";
import { Station } from "@/components/ui/station";

import { ContactForm } from "./contact-form";

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
        <ContactForm />
        <p className="journey-spec-label" style={{ marginTop: "2rem" }}>
          Prefer a shell? Type <code>help</code> below.
        </p>
        <Terminal className="journey-terminal" />
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
