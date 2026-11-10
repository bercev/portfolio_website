"use client";

import { useEffect, useRef, useState } from "react";

import {
  BUST_YIELD_FADE_MS,
  BUST_YIELD_RESAMPLE_MS,
  bustYieldSamplePoints,
  cssColorAlpha,
  nextBustYielded,
} from "@/lib/bust-yield";
import {
  bustParked,
  bustTravelOpacity,
  setBustTravelBox,
} from "@/lib/bust-travel";
import {
  contactFaceRamp,
  scrollSnapshot,
  smoothstep01,
  subscribeScrollSnapshot,
  useScrollBlur,
  useScrollDive,
} from "@/lib/scroll-fx";

import { ParticleTextScene } from "./particle-text-scene";

/**
 * ParticlePortraitBust — the GATHER treatment (reel 10) of the portrait
 * bust, replacing the ASCII glyph renderer (run 9, RUN9-PARTICLE-PORTRAIT).
 *
 * The same portrait bust — derived from the user's profile photo
 * (public/images/portrait-bust.jpg; background crushed so the figure reads
 * as a clean silhouette) — is now sampled into a THREE point cloud by the
 * shared ParticleTextScene (image source): luminance-weighted palette, so
 * the face keeps its shading, and depth from luminance, so the cloud reads
 * as a sculpture when it turns. It assembles from a scatter on load,
 * bursts away from the pointer (the scene's repulsion field), and turns
 * with scroll — a three-quarter pose at the hero, eased toward ~57° plus
 * the base turn by the contact section, then back to front-facing at
 * "Let's connect" — the same turn grammar the glyph renderer had, driven
 * by the same shared scroll snapshot. Idle sway keeps it breathing on a
 * still page.
 *
 * DELIBERATE TRADE vs the glyph renderer: pointer-gaze yaw, chapter /
 * object glances, sustained attention, rim light, phosphor ghosts, and
 * the dither tear are gone — they were invisible-at-a-glance refinements
 * of a glyph field, and the cloud's rotation + repulsion are the legible
 * behaviors now. `lib/bust-edge.ts` (Sobel edge glyphs) goes away with it.
 *
 * Same visibility contract as before: only when the background's ASCII
 * mode is active (documentElement[data-ascii="active"]) and on desktop
 * widths (>= 900px). Under reduced motion the background never sets
 * data-ascii, so the bust stays absent — unchanged. As a background
 * layer it also picks up the progressive scroll blur (lib/scroll-fx).
 */

const BUST_IMAGE = "/images/portrait-bust.jpg";
// Sky ramp, dark to bright — luminance-weighted, so the face's shadows
// stay deep blue and its highlights go bright cyan. The wrapper dims
// the whole cloud to opacity-40, as it did the glyphs.
const BUST_PALETTE = ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"] as const;
const BUST_MAX_TURN = 1.0; // radians ≈ 57° across the full page scroll
const BUST_MAX_PARTICLES = 8_000; // small box; BERAT's 14k cap is overkill
// Settled three-quarter pose (round 4): the photo is a left-profile
// headshot, and a dead-front rest pose reads as a dome — the profile
// contour (nose/chin/jaw) does the work only when the cloud sits turned.
// ~26° at the hero, eased back to front-facing at contact by the same
// ramp that drives the turn-back (so "meets your eyes" still lands at 0).
const BUST_BASE_YAW = 0.45;

// The BERAT sculpture and its measure frame are background, not content —
// a sample landing on them must not count as covered (the hero's right
// side is clear of text even though the canvas spans it).
const BUST_YIELD_EXCLUDE =
  "[data-hero-glyph-band],[data-particle-berat-root],[data-hero-measure-frame],[data-ascii-portrait-bust]";

/**
 * Is the viewport point covered by real page content? Walks from the
 * topmost element up to <main>: a point counts when it lands on leaf text,
 * an interactive element, an opaque background, or a visible border.
 * Background layers are pointer-events:none so they are never hit; the
 * BERAT band, canvases, and anything outside <main> (nav chrome, tray)
 * are excluded explicitly.
 */
function bustPointCovered(x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y);
  if (!el) return false;
  if (el.closest(BUST_YIELD_EXCLUDE)) return false;
  if (el.tagName === "CANVAS") return false;
  const main = document.querySelector("main");
  if (!main || !main.contains(el)) return false;
  let node: Element | null = el;
  while (node && node !== main) {
    const tag = node.tagName;
    if (/^(A|BUTTON|INPUT|TEXTAREA|SELECT|LABEL)$/.test(tag)) return true;
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim())
        return true;
    }
    const cs = getComputedStyle(node);
    if (cssColorAlpha(cs.backgroundColor) > 0.08) return true;
    if (
      parseFloat(cs.borderTopWidth) > 0 &&
      cssColorAlpha(cs.borderTopColor) > 0.08
    )
      return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * useBustTravel — the bust yields to content AND parks between chapters
 * (RUN9-BUST-OVERLAP + RUN9-BUST-TRAVEL): samples the 4x4 grid inside
 * the bust box on scroll/resize and on a short interval (layout changes
 * like a case-study expand fire no scroll event; the featured tape's
 * marquee also drifts pills through the zone), and flips the yielded
 * state through the hysteresis in lib/bust-yield.ts. The 600ms CSS fade
 * on the box smooths the flip; sampling is rAF-throttled and skips
 * hidden tabs. The same sample also resolves the park state from the
 * shared scroll snapshot (hero + contact show the figure, chapters
 * between park it at opacity 0) and publishes the live box + target
 * opacity to the bust-travel holder, so the glyph stream can yield to
 * the portrait instead of marching through it.
 */
function useBustTravel(
  boxRef: React.RefObject<HTMLDivElement | null>,
  active: boolean,
): { yielded: boolean; parked: boolean } {
  const [yielded, setYielded] = useState(false);
  const yieldedRef = useRef(false);
  const [parked, setParked] = useState(false);
  const parkedRef = useRef(false);

  useEffect(() => {
    if (!active) return undefined;
    let raf = 0;
    let queued = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const sample = () => {
      queued = false;
      const box = boxRef.current;
      if (!box || document.hidden) return;
      const rect = box.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      let covered = 0;
      for (const p of bustYieldSamplePoints(rect)) {
        if (bustPointCovered(p.x, p.y)) covered += 1;
      }
      const nextYielded = nextBustYielded(yieldedRef.current, covered);
      if (nextYielded !== yieldedRef.current) {
        yieldedRef.current = nextYielded;
        setYielded(nextYielded);
      }
      const nextParked = bustParked(scrollSnapshot.chapterIndex);
      if (nextParked !== parkedRef.current) {
        parkedRef.current = nextParked;
        setParked(nextParked);
      }
      setBustTravelBox({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        opacity: bustTravelOpacity(nextYielded, nextParked),
      });
    };
    const queue = () => {
      if (!queued) {
        queued = true;
        raf = requestAnimationFrame(sample);
      }
    };

    sample();
    timer = setInterval(sample, BUST_YIELD_RESAMPLE_MS);
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      if (timer !== undefined) clearInterval(timer);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      setBustTravelBox(null);
    };
  }, [active, boxRef]);

  return { yielded, parked };
}

function ParticleBustCanvas(): React.JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let disposed = false;
    let scene: ParticleTextScene | null = null;
    let observer: ResizeObserver | null = null;

    const start = async () => {
      const img = new Image();
      img.src = BUST_IMAGE;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      if (disposed || !img.naturalWidth) {
        if (!disposed) setFailed(true);
        return;
      }
      try {
        scene = new ParticleTextScene({
          canvas,
          colors: BUST_PALETTE,
          image: img,
          assemble: true,
          maxParticles: BUST_MAX_PARTICLES,
          // Face-scale repulsion: the 150px default eats ~55% of the
          // 300px head and reads as a donut (round-2 critic note).
          mouseRadius: 70,
          // Scroll turn + contact turn-back, same formula the glyph
          // renderer composed per tick — read live from the shared
          // snapshot, so the cloud turns with the page. The settled pose
          // is three-quarter (BUST_BASE_YAW), not dead-front: the
          // left-profile photo's nose/chin contour reads only when the
          // cloud sits turned (round-4 critic D1/D2). The base yaw fades
          // with the contact ramp, so the head still meets the reader
          // front-on at "Let's connect."
          yawSource: () => {
            const p = scrollSnapshot.progress;
            const ramp = contactFaceRamp(
              scrollSnapshot.y,
              scrollSnapshot.tops,
              scrollSnapshot.vh,
              scrollSnapshot.maxY,
            );
            const contactFace =
              -BUST_MAX_TURN * smoothstep01(p) * ramp;
            return (
              BUST_BASE_YAW * (1 - ramp) +
              BUST_MAX_TURN * smoothstep01(p) +
              contactFace
            );
          },
        });
        scene.start();
      } catch {
        // WebGL unavailable (or scene boot failed): no portrait rather
        // than a broken one — the hero still has BERAT + content, and
        // the glyph bust is gone, so there is no 2D fallback to keep.
        if (!disposed) setFailed(true);
        return;
      }
      observer = new ResizeObserver(() => scene?.resize());
      observer.observe(canvas);
    };
    void start();
    // Shared scroll snapshot: this component mounts only in animated
    // desktop ASCII mode (never under reduced motion), so it always
    // subscribes — the yaw source reads the identical snapshot the
    // glyph field and the rail read.
    const releaseSnapshot = subscribeScrollSnapshot();
    return () => {
      disposed = true;
      releaseSnapshot();
      observer?.disconnect();
      scene?.dispose();
    };
  }, []);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      data-particle-bust
      aria-hidden="true"
      className="absolute inset-0 block h-full w-full"
    />
  );
}

export function ParticlePortraitBust(): React.JSX.Element | null {
  const [asciiActive, setAsciiActive] = useState(false);
  const [wide, setWide] = useState(false);
  // Wrapper-level mount fade (a canvas remount mid-fade would lose the
  // drawn frame; fading the wrapper avoids that whole class of bug).
  const [fadedIn, setFadedIn] = useState(false);
  // Progressive scroll blur (v2): the bust is a background layer, so it
  // blurs with scroll depth alongside the glyph canvas.
  const blurRef = useScrollBlur<HTMLDivElement>(5, asciiActive && wide);
  // Scroll dive (run-2 IDEA iter 1): the head sinks and grows slightly as
  // you scroll past it — the viewer passes the portrait, it doesn't sit
  // still. Applied to the bust's own box (transform-origin = its center);
  // compositor-only, quantized, and off under reduced motion like the blur.
  const diveRef = useScrollDive<HTMLDivElement>(64, 0.08, asciiActive && wide);
  // Yield to content + park between chapters: fade the bust when real
  // content scrolls under it, and fade it out entirely for the chapters
  // between hero and contact (RUN9-BUST-TRAVEL).
  const { yielded, parked } = useBustTravel(diveRef, asciiActive && wide);
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
      ref={blurRef}
      aria-hidden="true"
      data-ascii-portrait-bust
      data-bust-yielded={yielded ? "true" : "false"}
      data-bust-parked={parked ? "true" : "false"}
      style={{
        position: "fixed",
        inset: 0,
        // Layering: above the journey scene (2) AND the content-frost blur (5)
        // — a 14px backdrop blur would dissolve the fine particles — but
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
        // Soft vignette: the dense particle block must read as background
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
        <div
          ref={diveRef}
          // Dimmed for the simplified background (research iter 51, W3C
          // foreground-obscured pattern + crossfeyer legibility): on the calm
          // glyph field the bust reads as quiet background texture while
          // the figure still registers. Round 4 raises the particle bust
          // from 0.40 to 0.65: dots carry less information per mark than
          // glyphs, so at 0.40 the settled cloud reads as a smudge next to
          // the undimmed BERAT field (critic D1); 0.65 restores the old
          // glyphs' visual weight while the scroll blur still softens it
          // over copy further down the page. The iter-10 vignette mask +
          // size (about clearance) are untouched by the v2 renderer.
          // useScrollDive drives this box's transform (scroll sinks + grows).
          // RUN9-BUST-OVERLAP: the box yields to content — when the sampler
          // finds real content under the box it fades to 0.12 over 600ms
          // (the hero stays bright; reading sections stay calm).
          // RUN9-BUST-TRAVEL: the box parks between chapters — hero and
          // contact show the figure, chapters 1–5 fade it to 0 entirely,
          // so no smudge lingers behind the plates mid-scroll.
          className="relative aspect-square w-[clamp(200px,22vw,300px)]"
          style={{
            opacity: bustTravelOpacity(yielded, parked),
            transition: `opacity ${BUST_YIELD_FADE_MS}ms ease`,
          }}
        >
          <ParticleBustCanvas />
        </div>
      </div>
    </div>
  );
}
