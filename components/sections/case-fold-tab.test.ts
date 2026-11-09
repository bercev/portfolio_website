import { describe, expect, it } from "vitest";

import {
  DISPATCH_KICKER,
  FOLD_TAB_PRESS_SCALE,
  FOLD_TAB_RULE_MS,
  foldTabLabel,
} from "./case-fold-tab";

describe("foldTabLabel", () => {
  it("opens the drawing when closed, folds it when open", () => {
    expect(foldTabLabel(false)).toBe("OPEN THE DRAWING");
    expect(foldTabLabel(true)).toBe("FOLD THE DRAWING");
  });
});

describe("FOLD_TAB_RULE_MS", () => {
  it("matches the panel height-animation duration so tab and panel unfold as one", () => {
    expect(FOLD_TAB_RULE_MS).toBe(450);
  });
});

describe("FOLD_TAB_PRESS_SCALE", () => {
  it("is the reel-4 press scale", () => {
    expect(FOLD_TAB_PRESS_SCALE).toBe(0.97);
  });
});

describe("DISPATCH_KICKER", () => {
  it("speaks in the contact slice's dispatch voice", () => {
    expect(DISPATCH_KICKER).toBe("DISPATCH — NEXT STEP");
  });
});
