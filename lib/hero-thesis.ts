/**
 * RUN10-THESIS — kinetic word reveal for the hero's research-thesis line
 * (Componentry Kinetic Text Reveal as direction reference, rebuilt in our
 * own stack — no install). Words rise in ~25ms apart with the site's
 * ease-out; each word's own rise is 200ms. Pure model, unit-tested.
 */

/** Stagger between consecutive words. */
export const THESIS_WORD_STAGGER_MS = 25;
/** One word's rise duration. */
export const THESIS_WORD_DURATION_S = 0.2;
/** The thesis is first in the lede, so its first word starts just before
    the meta line's 0.15s entrance. */
export const THESIS_BASE_DELAY_S = 0.12;
/** Site ease-out, shared with the lede stagger. */
export const THESIS_EASE = [0.22, 1, 0.36, 1] as const;

/** Split a sentence into its reveal words (whitespace split, empties dropped). */
export function thesisWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/** Delay (seconds) before word `index` starts rising. Non-finite or
    negative indices fall back to the base delay. */
export function thesisWordDelay(index: number): number {
  const safe = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return THESIS_BASE_DELAY_S + (safe * THESIS_WORD_STAGGER_MS) / 1000;
}
