/**
 * Hero STATUS plate helpers (run-9 RUN9-HERO-SIGNALS).
 *
 * The hero signals strip stops being three bare label/value rows and
 * becomes a stamped status plate in the drawing set's language: a sheet
 * head ("Status — Sheet 01"), numbered status lines (01 Now / 02
 * Published / 03 Open to) whose numerals press in and whose hairline
 * rules draw across on first view — the Elsewhere-plate / REV-letter
 * press-and-draw family. Copy is verbatim from content.ts; these
 * helpers only number the lines and time the entrance.
 */

/** Status-line number, 1-based and zero-padded: "01". */
export function heroSignalNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

/**
 * The press + draw start just after the plate's own entrance fade
 * begins (the dl fades in from 0.24s), 45ms stagger per line — the
 * same stagger as the Elsewhere directory rows.
 */
export function heroSignalDrawDelay(index: number) {
  return 0.5 + index * 0.045;
}

/** Numeral press-in duration, seconds (220ms ease-out, scale 1.25→1). */
export const HERO_SIGNAL_PRESS_DURATION = 0.22;

/** Hairline rule draw duration, seconds (0.5s scaleX 0→1). */
export const HERO_SIGNAL_RULE_DURATION = 0.5;
