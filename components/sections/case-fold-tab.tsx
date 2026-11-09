/**
 * Fold tab + dispatch plate for project case studies (run-9
 * RUN9-CASE-FOLD-TAB).
 *
 * The case-study expand affordance was the last element on the project
 * sheets still in pre-run-9 form — bare accent text ("Read the case
 * study") and a bare underlined conversion line. It is now drawing
 * chrome: the toggle is an "OPEN THE DRAWING" fold tab (bordered plate
 * with a folded corner, an arrow that rotates as the panel expands, and
 * a hairline rule that draws on the panel's own 0.45s ease), and the
 * conversion line is a stamped dispatch plate in the contact slice's
 * language ("DISPATCH — NEXT STEP").
 *
 * Motion reference (research, iter 24): Plasma Duo Style Bottom Sheet
 * Open (60fps shot 2126) — the panel unfolds from the tab edge like a
 * sheet; CRED Ticket Pop on Slider (shot 2121) — the dispatch plate as
 * a stamped ticket. The height-expand mechanism and aria-expanded are
 * untouched; the tab label is aria-hidden (the button's name comes from
 * the sheet content + aria-expanded, as before).
 */
"use client";

/** The tab reads as a drawing instruction: open to unfold, fold to close. */
export function foldTabLabel(open: boolean): "OPEN THE DRAWING" | "FOLD THE DRAWING" {
  return open ? "FOLD THE DRAWING" : "OPEN THE DRAWING";
}

/** The tab's rule draws on the panel's height-animation timing (0.45s). */
export const FOLD_TAB_RULE_MS = 450;

/** The dispatch plate presses like the hero CTA (reel-4 press scale). */
export const FOLD_TAB_PRESS_SCALE = 0.97;

/** Kicker printed on the dispatch plate, in the contact slice's voice. */
export const DISPATCH_KICKER = "DISPATCH — NEXT STEP";

export function FoldTab({ open }: { readonly open: boolean }) {
  return (
    <span
      className={
        open
          ? "journey-case-study-more journey-case-study-more--open"
          : "journey-case-study-more"
      }
      aria-hidden="true"
    >
      <span className="journey-fold-tab-label">{foldTabLabel(open)}</span>
      <span className="journey-fold-tab-arrow" aria-hidden="true">
        ↓
      </span>
      <span className="journey-fold-tab-rule" aria-hidden="true" />
    </span>
  );
}

export function DispatchPlate() {
  return (
    <a href="#contact" className="cursor-target" data-case-study-cta>
      <span className="case-study-dispatch-kicker" aria-hidden="true">
        {DISPATCH_KICKER}
      </span>
      <span className="case-study-dispatch-line">
        Want the full story? Let&rsquo;s talk{" "}
        <span className="case-study-dispatch-arrow" aria-hidden="true">
          →
        </span>
      </span>
    </a>
  );
}
