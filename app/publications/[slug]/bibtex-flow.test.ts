import { describe, expect, it } from "vitest";

import {
  BIBTEX_FLOW_BEAM_DELAY_S,
  BIBTEX_FLOW_BEAM_MS,
  BIBTEX_FLOW_COPY_DELAY_S,
  BIBTEX_FLOW_FADE_MS,
  BIBTEX_FLOW_PRESS_MS,
  BIBTEX_FLOW_PRESS_SCALE,
  bibtexFlowCopyLabel,
  bibtexFlowSettle,
} from "@/lib/bibtex-flow";

describe("bibtexFlowSettle", () => {
  it("settles fully opaque, in place, dead square", () => {
    expect(bibtexFlowSettle()).toEqual({ y: 0, opacity: 1 });
  });
});

describe("bibtexFlowCopyLabel", () => {
  it('reads "Copy" at rest and "Copied" after a copy', () => {
    expect(bibtexFlowCopyLabel(false)).toBe("Copy");
    expect(bibtexFlowCopyLabel(true)).toBe("Copied");
  });
});

describe("bibtex flow timing", () => {
  it("fades in under half a second with the beam drawing first", () => {
    expect(BIBTEX_FLOW_FADE_MS).toBe(450);
    expect(BIBTEX_FLOW_BEAM_MS).toBe(500);
    expect(BIBTEX_FLOW_BEAM_DELAY_S).toBeLessThan(BIBTEX_FLOW_COPY_DELAY_S);
  });

  it("presses on the fold-tab timing at the reel-4 scale", () => {
    expect(BIBTEX_FLOW_PRESS_MS).toBe(220);
    expect(BIBTEX_FLOW_PRESS_SCALE).toBe(0.97);
  });
});
