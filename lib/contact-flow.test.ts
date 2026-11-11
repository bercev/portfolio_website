import { describe, expect, it } from "vitest";

import {
  CONTACT_FLOW_DELAY_MS,
  CONTACT_FLOW_EASE,
  CONTACT_FLOW_GLOW_DELAY_MS,
  CONTACT_FLOW_GLOW_PRESS_MS,
  CONTACT_FLOW_RISE_MS,
  CONTACT_FLOW_RISE_Y,
  CONTACT_FLOW_SCALE,
  CONTACT_FLOW_SLIDE_MS,
  CONTACT_FLOW_SLIDE_Y,
  contactFlowFormEnter,
  contactFlowFormExit,
  contactFlowGlowTransition,
  contactFlowReceiptEnter,
  contactFlowScrollTarget,
} from "./contact-flow";

describe("contact flow timings", () => {
  it("lifts the form up and away in ~400ms", () => {
    expect(CONTACT_FLOW_RISE_MS).toBe(400);
    expect(CONTACT_FLOW_RISE_Y).toBe(-24);
    expect(CONTACT_FLOW_SCALE).toBe(0.96);
  });

  it("slides the receipt panel up in ~300ms after a 100ms delay", () => {
    expect(CONTACT_FLOW_SLIDE_MS).toBe(300);
    expect(CONTACT_FLOW_SLIDE_Y).toBe(32);
    expect(CONTACT_FLOW_DELAY_MS).toBe(100);
  });

  it("presses the glow in as the panel settles", () => {
    expect(CONTACT_FLOW_GLOW_DELAY_MS).toBe(350);
    expect(CONTACT_FLOW_GLOW_PRESS_MS).toBe(220);
  });

  it("uses the site ease-out everywhere", () => {
    expect([...CONTACT_FLOW_EASE]).toEqual([0.16, 1, 0.3, 1]);
  });
});

describe("contactFlowFormExit", () => {
  it("rises, scales down, fades and collapses its height", () => {
    const exit = contactFlowFormExit(false);
    expect(exit).toMatchObject({
      opacity: 0,
      y: -24,
      scale: 0.96,
      height: 0,
      overflow: "hidden",
    });
    expect(exit.transition?.duration).toBeCloseTo(0.4);
  });

  it("is instant under reduced motion", () => {
    const exit = contactFlowFormExit(true);
    expect(exit.opacity).toBe(0);
    expect(exit.y).toBeUndefined();
    expect(exit.transition?.duration).toBe(0);
  });
});

describe("contactFlowFormEnter", () => {
  it("returns the form from below on 'send another'", () => {
    const enter = contactFlowFormEnter(false);
    expect(enter.initial).toMatchObject({ opacity: 0, y: 32 });
    expect(enter.animate).toMatchObject({ opacity: 1, y: 0 });
  });

  it("is instant under reduced motion", () => {
    const enter = contactFlowFormEnter(true);
    expect(enter.initial).toMatchObject({ opacity: 1, y: 0 });
    expect(enter.transition.duration).toBe(0);
  });
});

describe("contactFlowReceiptEnter", () => {
  it("slides the receipt panel up from below with a delay", () => {
    const enter = contactFlowReceiptEnter(false);
    expect(enter.initial).toMatchObject({ opacity: 0, y: 32 });
    expect(enter.animate).toMatchObject({ opacity: 1, y: 0 });
    expect(enter.transition.delay).toBeCloseTo(0.1);
    expect(enter.transition.duration).toBeCloseTo(0.3);
  });

  it("renders settled under reduced motion", () => {
    const enter = contactFlowReceiptEnter(true);
    expect(enter.initial).toMatchObject({ opacity: 1, y: 0 });
    expect(enter.transition.duration).toBe(0);
  });
});

describe("contactFlowGlowTransition", () => {
  it("presses in 220ms after a 350ms delay", () => {
    const t = contactFlowGlowTransition(false);
    expect(t.duration).toBeCloseTo(0.22);
    expect(t.delay).toBeCloseTo(0.35);
  });

  it("is instant under reduced motion", () => {
    expect(contactFlowGlowTransition(true).duration).toBe(0);
  });
});

describe("contactFlowScrollTarget", () => {
  it("lands the flow container 60px below the viewport top", () => {
    expect(contactFlowScrollTarget(700, 500)).toBe(1140);
    expect(contactFlowScrollTarget(20, 0)).toBe(0);
  });

  it("never scrolls above the page top", () => {
    expect(contactFlowScrollTarget(-100, 0)).toBe(0);
  });
});
