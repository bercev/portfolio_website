/**
 * Living-schematic timing for the case-study architecture diagrams
 * (run-9 RUN9-ARCH-SCHEMATIC-LIVE).
 *
 * On first view each diagram assembles in data-flow order: nodes light
 * in sequence, connector arrows draw in, arrowheads land as the stroke
 * arrives, and the chatbot's return arrow to Discord lands last as the
 * payoff. All timings are pure and server-safe so the sequence is
 * pinned by test instead of by JSX accident.
 */

/** One assembly step in a diagram's data-flow order. */
export type ArchStepKind = "node" | "flow" | "return" | "label";

/** A node lights in (opacity 0 → 1). */
export const ARCH_NODE_DURATION_S = 0.28;
/** A connector arrow draws in (pathLength 0 → 1). */
export const ARCH_FLOW_DURATION_S = 0.45;
/** The chatbot's return path is the longest stroke, so it draws slower. */
export const ARCH_RETURN_DURATION_S = 0.6;
/** The "grounded answer" label fades in with the return's landing. */
export const ARCH_LABEL_DURATION_S = 0.3;
/** Breathing room between steps so the sequence reads as a sequence. */
export const ARCH_STEP_GAP_S = 0.08;
/** The arrowhead starts fading in this long before its line lands. */
export const ARCH_MARKER_LEAD_S = 0.12;
/** The arrowhead itself fades in fast — it lands, it doesn't drift. */
export const ARCH_MARKER_DURATION_S = 0.15;

export function archStepDuration(kind: ArchStepKind): number {
  switch (kind) {
    case "node":
      return ARCH_NODE_DURATION_S;
    case "flow":
      return ARCH_FLOW_DURATION_S;
    case "return":
      return ARCH_RETURN_DURATION_S;
    case "label":
      return ARCH_LABEL_DURATION_S;
  }
}

/**
 * Delay before step `index` starts: the sum of every earlier step's
 * duration plus the gap after it. Rounded to ms so motion never sees
 * float dust (0.30000000000000004).
 */
export function archStepDelay(
  kinds: readonly ArchStepKind[],
  index: number,
): number {
  let t = 0;
  for (let i = 0; i < index; i++) {
    t += archStepDuration(kinds[i]) + ARCH_STEP_GAP_S;
  }
  return Math.round(t * 1000) / 1000;
}

/**
 * When the arrowhead for the flow at `flowIndex` fades in: just before
 * the line lands, so the head arrives with the stroke instead of
 * floating at the destination while the line is still travelling.
 */
export function archMarkerDelay(
  kinds: readonly ArchStepKind[],
  flowIndex: number,
): number {
  const delay =
    archStepDelay(kinds, flowIndex) +
    archStepDuration(kinds[flowIndex]) -
    ARCH_MARKER_LEAD_S;
  return Math.round(delay * 1000) / 1000;
}

/** Total assembly time for a step list (the last step's end). */
export function archSchematicTotal(kinds: readonly ArchStepKind[]): number {
  if (kinds.length === 0) return 0;
  const last = kinds.length - 1;
  return (
    Math.round(
      (archStepDelay(kinds, last) + archStepDuration(kinds[last])) * 1000,
    ) / 1000
  );
}

/**
 * Vitae's data-flow order: editor → merge engine → Postgres, then the
 * supporting systems (Clerk + CI/CD) light in together as one step —
 * they enable the pipeline, they aren't part of it.
 */
export const VITAE_ARCH_STEPS: readonly ArchStepKind[] = [
  "node",
  "flow",
  "node",
  "flow",
  "node",
  "node",
];

/**
 * Chatbot's data-flow order: question → index → Ollama → self-correction,
 * then the return arrow back to Discord (the payoff, drawn slowest) and
 * its "grounded answer" label landing with it.
 */
export const CHATBOT_ARCH_STEPS: readonly ArchStepKind[] = [
  "node",
  "flow",
  "node",
  "flow",
  "node",
  "flow",
  "node",
  "return",
  "label",
];
