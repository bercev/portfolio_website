"use client";

import { useEffect } from "react";

/** Tab-title ASCII decode delight (research iter 54, Jessa Wolfe "small
 * delights are the point" + avonture.be "if you're not looking for it,
 * you'll never see it").
 * Invisible chrome: every 60s the tab title runs a ~1.2s decode-scramble
 * through ASCII glyphs and resolves back to the real title, and when the
 * tab is hidden the title swaps to a calm terminal-voiced away line.
 * Zero on-page motion — can't trip the "too many animations" rule; skipped
 * entirely under prefers-reduced-motion, like the rest of the motion system.
 * Re-syncs the real title before every run because client-side navigation
 * (paper pages) changes document.title after mount. */

const GLYPHS = "!<>-_[]{}=+*^?#&%$@";
const SCRAMBLE_MS = 1200;
const IDLE_MS = 60_000;
const AWAY_TITLE = "$ session idle — come back soon";

export default function TabTitleDelight() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!document.title) return;

    let realTitle = document.title;
    let interval: number | undefined;
    let raf: number | undefined;

    const scramble = () => {
      if (document.visibilityState !== "visible") return;
      realTitle = document.title;
      const start = performance.now();
      const tick = () => {
        if (document.visibilityState !== "visible") {
          document.title = realTitle;
          return;
        }
        const progress = Math.min(1, (performance.now() - start) / SCRAMBLE_MS);
        const resolved = Math.floor(progress * realTitle.length);
        let out = realTitle.slice(0, resolved);
        for (let i = resolved; i < realTitle.length; i++) {
          out +=
            realTitle[i] === " "
              ? " "
              : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        document.title = out;
        if (progress < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          document.title = realTitle;
        }
      };
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        document.title = AWAY_TITLE;
      } else {
        document.title = realTitle;
      }
    };

    interval = window.setInterval(scramble, IDLE_MS);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      if (raf !== undefined) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      document.title = realTitle;
    };
  }, []);

  return null;
}
