import { describe, expect, it } from "vitest";

import {
  FOLD_TAB_PRESS_SCALE,
  NEXT_STEP_KICKER,
  foldTabLabel,
} from "./case-fold-tab";

describe("foldTabLabel", () => {
  it("opens the story when closed, closes it when open", () => {
    expect(foldTabLabel(false)).toBe("OPEN THE STORY");
    expect(foldTabLabel(true)).toBe("CLOSE THE STORY");
  });
});

describe("FOLD_TAB_PRESS_SCALE", () => {
  it("is the reel-4 press scale", () => {
    expect(FOLD_TAB_PRESS_SCALE).toBe(0.97);
  });
});

describe("NEXT_STEP_KICKER", () => {
  it("speaks in plain language", () => {
    expect(NEXT_STEP_KICKER).toBe("NEXT STEP");
  });
});
