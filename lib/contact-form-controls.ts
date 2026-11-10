/** Contact-form controls (run-9 iter 27, RUN9-FORM-CONTROLS; plates in
 * iter 48, RUN9-FIELD-PLATES): the dispatch sheet's fields are numbered
 * field plates, not bare ledger lines — each field carries a bordered
 * plate face, an inner margin frame, "+" registration marks and a chip
 * numeral, and focusing it draws an accent pen-rule across the plate's
 * bottom edge while the field numeral presses in. Topic chips are
 * numbered file tabs (FILE A / B / C); the submit is a stamped
 * full-width TRANSMIT plate.
 *
 * Constants mirror the fold-tab / case-detail press-and-draw language so
 * the timings stay one family: rule draw 450ms (FOLD_TAB_RULE_MS), numeral
 * press 220ms from 1.25 (the Elsewhere / case-detail press), submit press
 * 0.97 (the site-wide plate press). */

/** The three dispatch fields, in sheet order. */
export type ContactFieldName = "name" | "email" | "message";

/** Sheet number for a field, in the same "01 / 02 / 03" language the
 * validation copy uses ("FIELD 01 · NAME TOO SHORT"). */
export function contactFieldNumber(field: ContactFieldName): string {
  switch (field) {
    case "name":
      return "01";
    case "email":
      return "02";
    case "message":
      return "03";
  }
}

export const CONTACT_FIELD_RULE_MS = 450;
export const CONTACT_FIELDNUM_PRESS_MS = 220;
export const CONTACT_FIELDNUM_PRESS_SCALE = 1.25;
export const CONTACT_SUBMIT_PRESS_SCALE = 0.97;

/** File-tab letter for a topic chip: index 0 -> "A", 1 -> "B", 2 -> "C".
 * Past Z the tabs fall back to a numbered form so the label never wraps
 * into a two-character tab. */
export function contactTopicTab(index: number): string {
  if (Number.isInteger(index) && index >= 0 && index < 26) {
    return String.fromCharCode(65 + index);
  }
  return `T${index + 1}`;
}
