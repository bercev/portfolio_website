import type { PortfolioContent } from "@/data/content";

import { TopoTexture } from "@/components/effects/topo-texture";
import { TerminalFlyout } from "@/components/terminal/terminal-flyout";
import { Station } from "@/components/ui/station";

import { ContactForm } from "./contact-form";
import { ElsewherePlate } from "./elsewhere-plate";

export function ContactFooter({
  content,
}: {
  content: PortfolioContent["contact"];
}) {
  return (
    <Station
      id="contact"
      heading={content.heading}
      className="journey-station--connect"
    >
      <TopoTexture />
      <div className="journey-col-main journey-copy journey-copy--connect">
        <p className="journey-lead text-lg leading-8">{content.message}</p>
        <ContactForm />
        <div className="journey-terminal-flyout-wrap">
          <TerminalFlyout />
        </div>
      </div>

      <ElsewherePlate links={content.links} />
    </Station>
  );
}
