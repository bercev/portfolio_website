import { describe, expect, it } from "vitest";

import {
  ARCH_FLOW_DURATION_S,
  ARCH_LABEL_DURATION_S,
  ARCH_MARKER_LEAD_S,
  ARCH_NODE_DURATION_S,
  ARCH_RETURN_DURATION_S,
  ARCH_STEP_GAP_S,
  archMarkerDelay,
  archSchematicTotal,
  archStepDelay,
  archStepDuration,
  CHATBOT_ARCH_STEPS,
  VITAE_ARCH_STEPS,
} from "./arch-schematic";

describe("archStepDuration", () => {
  it("pins each kind's duration", () => {
    expect(archStepDuration("node")).toBe(ARCH_NODE_DURATION_S);
    expect(archStepDuration("flow")).toBe(ARCH_FLOW_DURATION_S);
    expect(archStepDuration("return")).toBe(ARCH_RETURN_DURATION_S);
    expect(archStepDuration("label")).toBe(ARCH_LABEL_DURATION_S);
  });
});

describe("archStepDelay", () => {
  // The lib rounds to ms; expectations built from the same constants
  // must round the same way or 0.28 + 0.08 reads 0.36000000000000004.
  const ms = (n: number) => Math.round(n * 1000) / 1000;

  it("starts the first step immediately", () => {
    expect(archStepDelay(VITAE_ARCH_STEPS, 0)).toBe(0);
    expect(archStepDelay(CHATBOT_ARCH_STEPS, 0)).toBe(0);
  });

  it("sequences Vitae in data-flow order", () => {
    const d = (i: number) => archStepDelay(VITAE_ARCH_STEPS, i);
    expect(d(1)).toBe(ms(ARCH_NODE_DURATION_S + ARCH_STEP_GAP_S));
    expect(d(2)).toBe(ms(d(1) + ARCH_FLOW_DURATION_S + ARCH_STEP_GAP_S));
    expect(d(3)).toBe(ms(d(2) + ARCH_NODE_DURATION_S + ARCH_STEP_GAP_S));
    expect(d(4)).toBe(ms(d(3) + ARCH_FLOW_DURATION_S + ARCH_STEP_GAP_S));
    expect(d(5)).toBe(ms(d(4) + ARCH_NODE_DURATION_S + ARCH_STEP_GAP_S));
    // Concrete values, so a timing change is a deliberate edit, not drift.
    expect([d(0), d(1), d(2), d(3), d(4), d(5)]).toEqual([
      0, 0.36, 0.89, 1.25, 1.78, 2.14,
    ]);
  });

  it("sequences the chatbot with the return + label last", () => {
    const d = (i: number) => archStepDelay(CHATBOT_ARCH_STEPS, i);
    expect([d(0), d(1), d(2), d(3), d(4), d(5), d(6), d(7), d(8)]).toEqual([
      0, 0.36, 0.89, 1.25, 1.78, 2.14, 2.67, 3.03, 3.71,
    ]);
  });

  it("is strictly increasing, so no two steps start together", () => {
    for (const steps of [VITAE_ARCH_STEPS, CHATBOT_ARCH_STEPS]) {
      const delays = steps.map((_, i) => archStepDelay(steps, i));
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThan(delays[i - 1]);
      }
    }
  });
});

describe("archMarkerDelay", () => {
  it("lands each arrowhead just before its line arrives", () => {
    for (const steps of [VITAE_ARCH_STEPS, CHATBOT_ARCH_STEPS]) {
      steps.forEach((kind, i) => {
        if (kind !== "flow" && kind !== "return") return;
        const marker = archMarkerDelay(steps, i);
        const flowStart = archStepDelay(steps, i);
        const flowEnd = flowStart + archStepDuration(kind);
        expect(marker).toBeGreaterThan(flowStart);
        expect(marker).toBe(
          Math.round((flowEnd - ARCH_MARKER_LEAD_S) * 1000) / 1000,
        );
      });
    }
  });

  it("pins the Vitae + chatbot return marker delays", () => {
    expect(archMarkerDelay(VITAE_ARCH_STEPS, 1)).toBe(0.69);
    expect(archMarkerDelay(VITAE_ARCH_STEPS, 3)).toBe(1.58);
    expect(archMarkerDelay(CHATBOT_ARCH_STEPS, 7)).toBe(3.51);
  });
});

describe("archSchematicTotal", () => {
  it("is the last step's end, and both diagrams assemble in seconds", () => {
    expect(archSchematicTotal(VITAE_ARCH_STEPS)).toBe(2.42);
    expect(archSchematicTotal(CHATBOT_ARCH_STEPS)).toBe(4.01);
    expect(archSchematicTotal([])).toBe(0);
  });
});
