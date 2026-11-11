import type { Metadata } from "next";

import { NotFoundGhostFigure } from "@/components/sections/not-found-figure";
import { PaperActionPlate } from "@/components/sections/paper-action-plate";
import {
  NotFoundSpreadMeasure,
  NotFoundTearEdge,
} from "@/components/sections/not-found-spread";

export const metadata: Metadata = {
  title: "404 — segment not found",
  robots: { index: false, follow: false },
};

/**
 * Missing sheet (run-9 RUN9-ROUTES): the 404 stops speaking terminal and
 * becomes an empty drawing sheet — bordered plate, inner margin frame, a
 * ghost wireframe where the drawing would be (run-9 RUN9-404-GHOST-FIGURE:
 * diagonal cross + dimension lines + "NO DRAWING" stamp, so the joke reads
 * as a drawing, not an empty box), and a title-block footer. Server
 * component: no journey/WebGL, no new dependencies, renders inside the
 * root layout (skip link + theme providers). One status line, one plain
 * sentence, two ways out — same as before, in the site's new drafting
 * language. The terminal flyout itself is untouched (frozen).
 *
 * Run-9 RUN9-404-SPREAD: the lone plate becomes a full missing-sheet
 * spread — the sheet goes wide so the ghost figure reads at full-bleed
 * scale, an oversized exterior dimension line measures the figure above
 * it, and the bottom border is replaced by a torn-sheet edge. (Run 10
 * removed the BlueprintField canvas that used to mount behind it; the
 * spread itself is a later run-10 backlog item.)
 */
export default function NotFound() {
  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className="not-found-sheet"
        data-light-chapter="notfound"
      >
        <div className="journey-sheet-head not-found-sheet-head">
          <span>Drawing — Sheet not on file</span>
          <span>Rev —</span>
        </div>
        <div className="not-found-spread">
          <div className="not-found-spread-figure">
            <NotFoundSpreadMeasure />
            <NotFoundGhostFigure />
            <p className="journey-pub-fig-caption not-found-ghost-caption">
              Fig. — · No drawing on file
            </p>
          </div>
          <div className="not-found-spread-status">
            <h1 className="not-found-status">404 — Sheet not found</h1>
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
      <footer className="journey-sheet-titleblock not-found-titleblock">
        <div>
          <span className="journey-sheet-titleblock-label">Sheet</span>
          Not on file
        </div>
        <div>
          <span className="journey-sheet-titleblock-label">Scale</span>
          1:1
        </div>
        <div>
          <span className="journey-sheet-titleblock-label">Drawn by</span>
          Berat
        </div>
      </footer>
      <NotFoundTearEdge />
    </main>
    </>
  );
}
