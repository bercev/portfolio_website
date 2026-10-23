"use client";

import { useEffect, useState } from "react";

import { AsciiArtStatic } from "./aceternity-ascii-art";

/**
 * AsciiPortraitBust — Figure system v2 (replaces the hand-rolled
 * AsciiPerson3D 3D-glyph humanoid, which never read in any screenshot across
 * many tuning iterations).
 *
 * Uses the pre-built Aceternity UI ASCII Art component (registry:
 * https://ui.aceternity.com/registry/ascii-art.json) to render a real
 * portrait bust — derived from the user's profile photo
 * (public/images/portrait-bust.jpg; background crushed so the figure reads
 * as a clean silhouette) — as FROST-tinted ASCII art. The monochrome
 * dithered target look comes from the user's "unslop" reference
 * (dither / noise / ASCII).
 *
 * Same visibility contract as the old figure: only when the journey's ASCII
 * mode is active (documentElement[data-ascii="active"]) and on desktop widths
 * (>= 900px). One persistent signature figure across all chapters (the old
 * bust/work crossfade and the donut are deleted with the old system).
 */
export function AsciiPortraitBust(): React.JSX.Element | null {
  const [asciiActive, setAsciiActive] = useState(false);
  const [wide, setWide] = useState(false);
  // Wrapper-level mount fade (the component itself renders static: its
  // animated "fade" path remounts motion.div -> div when the animation
  // finishes, which destroys the canvas without redrawing it).
  const [fadedIn, setFadedIn] = useState(false);
  useEffect(() => {
    if (!asciiActive || !wide) return;
    setFadedIn(false);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setFadedIn(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, [asciiActive, wide]);

  // Gate on ASCII mode + desktop widths (same contract as the old figure).
  useEffect(() => {
    const root = document.documentElement;
    const syncAscii = () =>
      setAsciiActive(root.getAttribute("data-ascii") === "active");
    syncAscii();
    const mo = new MutationObserver(syncAscii);
    mo.observe(root, { attributes: true, attributeFilter: ["data-ascii"] });

    const mq = window.matchMedia("(min-width: 900px)");
    const syncWide = () => setWide(mq.matches);
    syncWide();
    mq.addEventListener("change", syncWide);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", syncWide);
    };
  }, []);

  if (!asciiActive || !wide) return null;

  return (
    <div
      aria-hidden="true"
      data-ascii-portrait-bust
      style={{
        position: "fixed",
        inset: 0,
        // Layering: above the journey scene (2) AND the content-frost blur (5)
        // — a 14px backdrop blur would dissolve the fine ASCII glyphs — but
        // below page content (10) so text always paints over the figure, and
        // well below header/nav (40/50).
        zIndex: 8,
        pointerEvents: "none",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        // The bust faces left (toward the content) — park it right of center
        // with a viewport-relative margin so it never crowds the headline.
        paddingRight: "clamp(1.5rem, 5vw, 5rem)",
        opacity: fadedIn ? 1 : 0,
        transition: "opacity 1400ms ease",
        // Soft vignette: the dense ASCII block must read as background
        // texture, never as a hard rectangle competing with text painted
        // over it (z-10 content sits above). Fades the canvas edges so the
        // bust melts into the scene instead of butting against copy —
        // e.g. the about chapter's education panel.
        maskImage:
          "radial-gradient(ellipse 64% 64% at 50% 46%, black 52%, transparent 98%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 64% 64% at 50% 46%, black 52%, transparent 98%)",
      }}
    >
      <div
        style={{
          // Melt the content-facing (left) edge of the bust into the
          // background. The bust's left edge sits behind right-side copy —
          // publications venue/[cite], skills marquee pills, experience pill
          // tags, projects sidecar — and the wrapper's viewport-relative
          // radial vignette only softens the bust's outer edges, not the
          // edge facing the text. A linear left-fade clears the overlap
          // zone while the figure's core stays readable (research iter 51:
          // W3C "do not overlay words on busy backgrounds").
          maskImage: "linear-gradient(to right, transparent 0%, black 34%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 34%)",
        }}
      >
        <AsciiArtStatic
          src="/images/portrait-bust.jpg"
          resolution={72}
          charset="standard"
          color="#7dd3fc"
          backgroundColor="transparent"
          fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
          objectFit="cover"
          // Dimmed for the simplified background (research iter 51, W3C
          // foreground-obscured pattern + crossfeyer legibility): on the calm
          // glyph field the bust at opacity-70 read as a dense mass competing
          // with foreground copy — worst at the publications [cite] link +
          // venue line and the skills marquee pills, which sit on its densest
          // ASCII core in the bust's own FROST. At opacity-40 it reads as
          // quiet background texture while the figure still registers; the
          // iter-10 vignette mask + size (about clearance) are untouched.
          className="aspect-square w-[clamp(200px,22vw,300px)] opacity-40"
        />
      </div>
    </div>
  );
}
