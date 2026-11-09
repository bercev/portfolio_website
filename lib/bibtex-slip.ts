/**
 * Tear-off citation slip (run-9 RUN9-BIBTEX-SLIP): the paper pages' BibTeX
 * block stops being a stock bordered code box and becomes a drafted slip
 * torn from the sheet — a punched-hole perforation along the top edge, a
 * dashed tear line that draws across on first view, and a stamped COPY
 * plate. The slip itself settles from a slight tilt, the COPY label
 * presses in on the fold-tab timing, and the button presses at the
 * reel-4 0.97 scale. Copy semantics are verbatim (clipboard write, 2s
 * "Copied" reset, aria-live); the BibTeX text is verbatim.
 */

/** The slip settles from a slight tilt in 450ms. */
export const BIBTEX_SLIP_TEAR_MS = 450;
/** The dashed tear line draws across in 500ms (fold-tab rule timing). */
export const BIBTEX_SLIP_RULE_MS = 500;

/** The COPY label presses in on the REV-letter / field-note timing. */
export const BIBTEX_SLIP_PRESS_MS = 220;

/** Reel-4 press rule: buttons scale 0.97 on press. */
export const BIBTEX_SLIP_PRESS_SCALE = 0.97;

/** The tear line starts drawing just after the slip enters view. */
export const BIBTEX_SLIP_RULE_DELAY_S = 0.15;

/** The COPY label presses in just after the tear line starts. */
export const BIBTEX_SLIP_COPY_DELAY_S = 0.2;

/**
 * The settled slip: fully opaque, in place — and resting at a slight
 * torn-slip tilt (−0.5°) instead of dead square, so the tear-off
 * character survives the resting state (round-2 boldening: both
 * critics failed "vastly different" on the square settled state).
 */
export function bibtexSlipSettle() {
  return { rotate: -0.5, y: 0, opacity: 1 };
}

/** The button label: "Copy" at rest, "Copied" for 2s after a copy. */
export function bibtexSlipCopyLabel(copied: boolean) {
  return copied ? "Copied" : "Copy";
}
