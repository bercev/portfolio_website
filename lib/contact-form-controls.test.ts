import { describe, expect, it } from "vitest";

import {
  CONTACT_FLOWNUM_PRESS_MS,
  CONTACT_FLOWNUM_PRESS_SCALE,
  CONTACT_FLOW_RULE_MS,
  CONTACT_SUBMIT_PRESS_SCALE,
} from "./contact-form-controls";

describe("contact form control timings", () => {
  it("draws the focus light-rule on the fold-tab timing", () => {
    expect(CONTACT_FLOW_RULE_MS).toBe(450);
  });

  it("presses the flow number on the plate-press timing", () => {
    expect(CONTACT_FLOWNUM_PRESS_MS).toBe(220);
    expect(CONTACT_FLOWNUM_PRESS_SCALE).toBe(1.25);
  });

  it("presses the submit pill on the site-wide press", () => {
    expect(CONTACT_SUBMIT_PRESS_SCALE).toBe(0.97);
  });
});
