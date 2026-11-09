import type { Metadata } from "next";

import { PaperActionPlate } from "@/components/sections/paper-action-plate";

export const metadata: Metadata = {
  title: "404 — segment not found",
  robots: { index: false, follow: false },
};

/**
 * Missing sheet (run-9 RUN9-ROUTES): the 404 stops speaking terminal and
 * becomes an empty drawing sheet — bordered plate, inner margin frame, a
 * dashed empty FIG frame where the drawing would be, and a title-block
 * footer. Server component: no journey/WebGL, no new dependencies, renders
 * inside the root layout (skip link + theme providers). One status line,
 * one plain sentence, two ways out — same as before, in the site's new
 * drafting language. The terminal flyout itself is untouched (frozen).
 */
export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="not-found-sheet">
      <div className="journey-sheet-head not-found-sheet-head">
        <span>Drawing — Sheet not on file</span>
        <span>Rev —</span>
      </div>
      <h1 className="not-found-status">404 — Sheet not found</h1>
      <div className="not-found-empty-plate" aria-hidden="true">
        <span className="not-found-empty-plate-mark">+</span>
      </div>
      <p className="journey-pub-fig-caption not-found-empty-plate-caption">
        Fig. — · No drawing on file
      </p>
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
    </main>
  );
}
