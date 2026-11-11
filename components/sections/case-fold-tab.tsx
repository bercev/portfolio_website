/**
 * Fold tab + next-step line for project case studies (run-10
 * RUN10-PROJECTS).
 *
 * The case-study expand affordance was the last element on the project
 * rows still in run-9 drawing form — a bordered plate with a folded
 * corner reading "OPEN THE DRAWING", and a stamped "DISPATCH — NEXT
 * STEP" plate below the panel. It is now light: the toggle is a
 * luminous pill ("OPEN THE STORY" / "CLOSE THE STORY") with an arrow
 * that rotates as the panel expands and a soft glow that deepens while
 * open, and the conversion line is a plain next-step line with a glow
 * dot. The height-expand mechanism and aria-expanded are untouched;
 * the tab label is aria-hidden (the button's name comes from the row
 * content + aria-expanded, as before).
 */
"use client";

/** The tab reads as an invitation: open to read the story, close to fold it away. */
export function foldTabLabel(open: boolean): "OPEN THE STORY" | "CLOSE THE STORY" {
  return open ? "CLOSE THE STORY" : "OPEN THE STORY";
}

/** The pill presses like the hero CTA (reel-4 press scale). */
export const FOLD_TAB_PRESS_SCALE = 0.97;

/** Kicker on the next-step line, in plain language. */
export const NEXT_STEP_KICKER = "NEXT STEP";

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
    </span>
  );
}

export function DispatchPlate() {
  return (
    <a href="#contact" className="cursor-target" data-case-study-cta>
      <span className="case-study-dispatch-kicker" aria-hidden="true">
        {NEXT_STEP_KICKER}
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
