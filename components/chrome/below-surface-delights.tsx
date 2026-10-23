"use client";

import { useEffect } from "react";

/** Below-surface delights (research iter 54, avonture.be "Meerkat Mischief"
 * — "if you're not looking for it, you'll never see it"; jamesg.blog
 * "Joyful web design" — joy as a design goal).
 * The in-page delight surface is already deep (Konami, boot, snake,
 * beratfetch / fortune / cowsay / vim-trap, branded 404), but DevTools and
 * view-source — the exact audience (hiring engineers) most likely to look
 * there — had nothing. Invisible chrome: zero on-page motion, zero visual
 * change, no reduced-motion path needed.
 * (a) One styled console.log on first load — a FROST %c wink pointing at
 *     the terminal or the Konami code.
 * (b) The 5×29 block-letter BERAT mark from `beratfetch` (copied verbatim
 *     from components/terminal/shell.ts — honest reuse, no new art) as an
 *     HTML comment at the top of <body> for the view-source audience.
 * React strips JSX comments, so the comment is rendered via
 * dangerouslySetInnerHTML on an aria-hidden, display:none wrapper. */

/** Copied verbatim from the BERAT_MARK in components/terminal/shell.ts
 * (beratfetch). Keep in sync if that mark ever changes. */
const BERAT_MARK: readonly string[] = [
  "████  █████ ████    █   █████",
  "█   █ █     █   █  █ █    █  ",
  "████  ████  ████  █████   █  ",
  "█   █ █     █ █   █   █   █  ",
  "████  █████ █  █  █   █   █  ",
];

/** The raw HTML comment injected at the top of <body>. Must never contain
 * "--" inside (that would terminate the comment early) — enforced by the
 * unit test below-surface-delights.test.ts. */
export const VIEW_SOURCE_COMMENT =
  "<!--\n" +
  "\n" +
  BERAT_MARK.join("\n") +
  "\n" +
  "\n" +
  "  hand-set type. no pixels were harmed.\n" +
  "-->";

const WINK_STYLE = "color:#7dd3fc;font-family:monospace";

/** Module-level guard: React StrictMode double-invokes effects in dev, and
 * the wink should fire once per real page load, not per effect pass. */
let winked = false;

export default function BelowSurfaceDelights() {
  useEffect(() => {
    if (winked) return;
    winked = true;
    console.log(
      "%cyou found the console. there's more below the surface — open the terminal (top-right bubble) and try `beratfetch`, or press ↑↑↓↓←→←→ba.",
      WINK_STYLE,
    );
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{ display: "none" }}
      dangerouslySetInnerHTML={{ __html: VIEW_SOURCE_COMMENT }}
    />
  );
}
