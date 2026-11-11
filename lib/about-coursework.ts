/**
 * Pure helpers for the About coursework list (run-9 RUN9-ABOUT-COURSEWORK,
 * iter 30; re-skinned to light/flow in run-10 RUN10-ABOUT: the "CW-01"
 * part numbers are gone — the rows now carry the shared flow labels
 * ("01 / 07", lib/plate-labels.ts) — and the count reads as courses, not
 * parts. Server-safe: about.tsx (a server component) calls
 * courseworkCountLabel() for the label, so these must NOT live in the
 * "use client" component module (RSC boundary — same class as iter 7's
 * noteLabel and iter 9's plateLabels).
 */

/** Zero-padded course count for the label: "07 courses". */
export function courseworkCountLabel(count: number) {
  return `${String(count).padStart(2, "0")} courses`;
}

/** The part press + rule draw start just after the list enters view. */
export function courseworkDrawDelay(index: number) {
  return 0.1 + index * 0.045;
}
