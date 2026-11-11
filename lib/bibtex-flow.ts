/**
 * BibTeX as a light-flow panel (run-10 RUN10-PAPERS): the paper pages'
 * BibTeX stops being a tear-off slip — no perforation, no dashed tear
 * line, no tilt — and becomes a borderless panel lit from above: a beam
 * of accent light draws across the top edge on first scroll into view,
 * and the COPY control is a luminous pill (the fold-tab pill family).
 * Copy semantics are verbatim (clipboard write, 2s "Copied" reset,
 * aria-live); the BibTeX text is verbatim. Reduced motion renders the
 * panel settled from the first frame via the native hook (motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1).
 */

/** The panel fades in from 8px down in 450ms. */
export const BIBTEX_FLOW_FADE_MS = 450;
/** The light beam draws across in 500ms. */
export const BIBTEX_FLOW_BEAM_MS = 500;

/** The COPY label glows in on the field-note timing (220ms). */
export const BIBTEX_FLOW_PRESS_MS = 220;

/** Reel-4 press rule: buttons scale 0.97 on press. */
export const BIBTEX_FLOW_PRESS_SCALE = 0.97;

/** The beam starts drawing just after the panel enters view. */
export const BIBTEX_FLOW_BEAM_DELAY_S = 0.15;

/** The COPY label glows in just after the beam starts. */
export const BIBTEX_FLOW_COPY_DELAY_S = 0.2;

/** The settled panel: fully opaque, in place, dead square. */
export function bibtexFlowSettle() {
  return { y: 0, opacity: 1 };
}

/** The button label: "Copy" at rest, "Copied" for 2s after a copy. */
export function bibtexFlowCopyLabel(copied: boolean) {
  return copied ? "Copied" : "Copy";
}
