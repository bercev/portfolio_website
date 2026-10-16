import type { SectionId } from "./content";

/**
 * The compile narrative: each chapter of the journey is a step in a build
 * pipeline. Displayed as terminal build-log lines in the chapter gates.
 */
export const BUILD_LOGS: Record<SectionId, readonly string[]> = {
  home: ["compiling curiosity.c → curiosity.o"],
  about: ["linking background... OK", "resolving education... UC Santa Cruz"],
  publications: ["linking publications... 2 papers linked"],
  experience: ["warning: sleep not found", "linking experience... 3 roles linked"],
  projects: ["building projects... 3 shipped", "optimizing for fun... -O3"],
  skills: ["optimizing skills... -O3", "all targets up to date"],
  contact: ["./future --run"],
} as const;

/** Chapters whose build log ends with a live prompt (blinking cursor). */
export const BUILD_LOG_LIVE_PROMPT: ReadonlySet<SectionId> = new Set([
  "contact",
]);
