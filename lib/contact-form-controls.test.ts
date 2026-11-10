import { describe, expect, it } from "vitest";

import {
  CONTACT_FIELDNUM_PRESS_MS,
  CONTACT_FIELDNUM_PRESS_SCALE,
  CONTACT_FIELD_RULE_MS,
  CONTACT_SUBMIT_PRESS_SCALE,
  contactFieldNumber,
  contactTopicTab,
} from "./contact-form-controls";

describe("contactFieldNumber", () => {
  it("numbers the three dispatch fields in sheet order", () => {
    expect(contactFieldNumber("name")).toBe("01");
    expect(contactFieldNumber("email")).toBe("02");
    expect(contactFieldNumber("message")).toBe("03");
  });

  it("matches the numbers the validation copy names", () => {
    // "FIELD 01 · NAME TOO SHORT", "FIELD 02 · INVALID ADDRESS",
    // "FIELD 03 · MESSAGE TOO SHORT" — the plate numeral and the
    // error line must agree on which field is which.
    expect(`FIELD ${contactFieldNumber("name")}`).toBe("FIELD 01");
    expect(`FIELD ${contactFieldNumber("email")}`).toBe("FIELD 02");
    expect(`FIELD ${contactFieldNumber("message")}`).toBe("FIELD 03");
  });
});

describe("contactTopicTab", () => {
  it("letters the three real topics A / B / C", () => {
    expect(contactTopicTab(0)).toBe("A");
    expect(contactTopicTab(1)).toBe("B");
    expect(contactTopicTab(2)).toBe("C");
  });

  it("letters through Z, then falls back to a numbered tab", () => {
    expect(contactTopicTab(25)).toBe("Z");
    expect(contactTopicTab(26)).toBe("T27");
  });

  it("never returns an empty or multi-character tab for a bad index", () => {
    expect(contactTopicTab(-1)).toBe("T0");
    expect(contactTopicTab(1.5)).toBe("T2.5");
  });
});

describe("contact form control timings", () => {
  it("draws the focus pen-rule on the fold-tab timing", () => {
    expect(CONTACT_FIELD_RULE_MS).toBe(450);
  });

  it("presses the field numeral on the plate-press timing", () => {
    expect(CONTACT_FIELDNUM_PRESS_MS).toBe(220);
    expect(CONTACT_FIELDNUM_PRESS_SCALE).toBe(1.25);
  });

  it("presses the submit plate on the site-wide plate press", () => {
    expect(CONTACT_SUBMIT_PRESS_SCALE).toBe(0.97);
  });
});
