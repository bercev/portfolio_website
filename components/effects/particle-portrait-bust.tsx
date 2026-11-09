"use client";

import { useEffect, useRef, useState } from "react";

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
          className="relative aspect-square w-[clamp(200px,22vw,300px)] opacity-[0.65]"
        >
          <ParticleBustCanvas />
        </div>
      </div>
    </div>
  );
}
