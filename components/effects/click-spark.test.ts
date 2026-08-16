import { describe, expect, it } from "vitest";

import { CLICK_SPARK_DEFAULTS } from "./click-spark";

describe("ClickSpark defaults", () => {
  it("uses the requested cyan spark settings", () => {
    expect(CLICK_SPARK_DEFAULTS).toEqual({
      sparkColor: "#00ffff",
      sparkSize: 10,
      sparkRadius: 20,
      sparkCount: 7,
      duration: 600,
    });
  });
});
