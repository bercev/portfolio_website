/**
 * Pure helpers for the About coursework parts list (run-9
 * RUN9-ABOUT-COURSEWORK, iter 30). Server-safe: about.tsx (a server
 * component) calls courseworkCountLabel() for the label, so these must
 * NOT live in the "use client" component module (RSC boundary — same
 * class as iter 7's noteLabel and iter 9's plateLabels).
 */

/** Course part number, 1-based and zero-padded: "CW-01". */
export function courseworkPartLabel(index: number) {
  return `CW-${String(index + 1).padStart(2, "0")}`;
}

/** Zero-padded part count for the label: "07 parts". */
export function courseworkCountLabel(count: number) {
  return `${String(count).padStart(2, "0")} parts`;
}

/** The part press + rule draw start just after the list enters view. */
export function courseworkDrawDelay(index: number) {
  return 0.1 + index * 0.045;
}
