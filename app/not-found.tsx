import type { Metadata } from "next";

import { NotFoundLightVoid } from "@/components/sections/not-found-light";
import { PaperActionPlate } from "@/components/sections/paper-action-plate";
import { notFoundLightCaption } from "@/lib/plate-labels";

export const metadata: Metadata = {
  title: "404 — segment not found",
  robots: { index: false, follow: false },
};

/**
 * Missing light (run-10 RUN10-404): the 404 stops speaking drafting
 * and becomes a field of light — a borderless haloed panel (the
 * contact-form panel family: card 88% wash + 120px accent halo + inner
 * luminous wash, no border, no inner frame) holding a light void where
 * the figure would be (run-10 not-found-light.tsx: a glowing track
 * with a drifting orb, and a "No light on file" glow chip below it,
 * quiet caption "Empty field"). The run-9 drafting chrome is gone:
 * no dimension line, no ghost wireframe, no "NO DRAWING" stamp, no
 * torn-sheet edge, no title block, no flow head (the "01 / 01" plate
 * number read as sheet-index residue — the headline carries the
 * status), no "Sheet not found" headline, no dimension figures.
 * Server component: no journey/WebGL, no new dependencies, renders
 * inside the root layout (skip link + theme providers). One status
 * line, one plain sentence, two ways out — same as before, in the
 * site's light/flow language. The terminal flyout itself is untouched
 * (frozen).
 */
export default function NotFound() {
  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className="not-found-field"
        data-light-chapter="notfound"
      >
        <div className="not-found-spread">
          <div className="not-found-spread-figure">
            <NotFoundLightVoid />
            <p className="journey-pub-fig-caption not-found-light-caption">
              {notFoundLightCaption()}
            </p>
          </div>
          <div className="not-found-spread-status">
            <h1 className="not-found-status">404 — Not found</h1>
            <p className="not-found-line">
              This address doesn&rsquo;t resolve to anything here.
            </p>
            <nav aria-label="Where to go from here" className="not-found-nav">
              <PaperActionPlate
                href="/"
                index={0}
                label="back home"
                arrow="←"
                arrowPosition="before"
                arrowDirection="left"
              />
              <PaperActionPlate
                href="/#contact"
                index={1}
                label="get in touch"
                arrow="→"
                arrowDirection="right"
              />
            </nav>
          </div>
        </div>
      </main>
    </>
  );
}
