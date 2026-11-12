/** Contact-form controls (run-9 iter 27, RUN9-FORM-CONTROLS; re-skinned
 * run-10 iter 10, RUN10-CONTACT): the form's fields are light fields,
 * not numbered plates — each field carries a glow dot + flow number
 * ("01 / 03" via the shared `flowLabels`), and focusing it draws an
 * accent light-rule across the field's bottom edge while the flow
 * number presses in. Topic chips are light pills with a glow dot; the
 * submit is a slide-to-send track (run-10 iter 42, RUN10-SLIDE-SEND —
 * its timings live in lib/slide-to-send.ts).
 *
 * Constants mirror the fold-tab / case-detail press-and-draw language so
 * the timings stay one family: light-rule draw 450ms, flow-number
 * press 220ms from 1.25 (the Elsewhere / case-detail press). */

/** The three contact fields, in form order. */
export type ContactFieldName = "name" | "email" | "message";

export const CONTACT_FLOW_RULE_MS = 450;
export const CONTACT_FLOWNUM_PRESS_MS = 220;
export const CONTACT_FLOWNUM_PRESS_SCALE = 1.25;
