"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AsciiPerson2D — large 2D Braille-art person, posed per scroll chapter.
 *
 * Replaces the failed 3D point-cloud person (a blobby cyan mass). Each pose is
 * a hand-designed figure rasterized onto a dot grid, then converted to Braille
 * pattern characters (U+2800 block) and pre-rendered to an offscreen canvas.
 * A fixed-position canvas beside the content crossfades between poses as the
 * visitor scrolls through chapters.
 */

type Pose2D = "typing" | "welcome" | "reading" | "building" | "celebrate" | "waving";

const SECTION_POSE: Record<string, Pose2D> = {
  home: "typing",
  about: "welcome",
  publications: "reading",
  experience: "building",
  projects: "building",
  skills: "celebrate",
  contact: "waving",
};

const BODY = "#2fd8ff"; // phosphor cyan
const PROP = "#ffb648"; // phosphor amber
const SCREEN = "rgba(47, 216, 255, 0.4)"; // dim cyan (monitor screen, ground)

// ---------------------------------------------------------------------------
// Dot-grid rasterizer. Layer priority when compositing a Braille cell:
// screen > prop > body (so the monitor screen shows through its frame, and
// the amber book reads over the cyan torso).
// ---------------------------------------------------------------------------

const L_BODY = 0;
const L_PROP = 1;
const L_SCREEN = 2;

interface DotGrid {
  w: number;
  h: number;
  layers: Uint8Array[]; // [body, prop, screen]
}

function makeGrid(w: number, h: number): DotGrid {
  return { w, h, layers: [new Uint8Array(w * h), new Uint8Array(w * h), new Uint8Array(w * h)] };
}

function setDot(g: DotGrid, layer: number, x: number, y: number): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= g.w || yi >= g.h) return;
  g.layers[layer]![xi + yi * g.w] = 1;
}

function disc(g: DotGrid, layer: number, cx: number, cy: number, r: number): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) setDot(g, layer, x, y);
    }
  }
}

/** Thick segment between two points. */
function seg(
  g: DotGrid,
  layer: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const r = w / 2;
  const steps = Math.ceil(len);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(g, layer, x0 + dx * t, y0 + dy * t, r);
  }
}

function rect(g: DotGrid, layer: number, x: number, y: number, w: number, h: number): void {
  for (let yy = Math.round(y); yy < Math.round(y + h); yy++) {
    for (let xx = Math.round(x); xx < Math.round(x + w); xx++) {
      setDot(g, layer, xx, yy);
    }
  }
}

// ---------------------------------------------------------------------------
// Pose designs (dot coordinates).
// ---------------------------------------------------------------------------

/** Shared standing body; returns shoulder/hip anchor points. */
function standingBody(g: DotGrid): { shoulderL: [number, number]; shoulderR: [number, number] } {
  disc(g, L_BODY, 32, 12, 8); // head
  seg(g, L_BODY, 32, 19, 32, 25, 5); // neck
  seg(g, L_BODY, 32, 25, 32, 58, 12); // torso
  seg(g, L_BODY, 31, 58, 24, 90, 8); // left leg
  seg(g, L_BODY, 33, 58, 40, 90, 8); // right leg
  seg(g, L_BODY, 24, 90, 16, 90, 5); // left foot
  seg(g, L_BODY, 40, 90, 48, 90, 5); // right foot
  seg(g, L_SCREEN, 6, 93, 58, 93, 2); // ground line
  return { shoulderL: [26, 31], shoulderR: [38, 31] };
}

function arm(
  g: DotGrid,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  seg(g, L_BODY, sx, sy, ex, ey, 7);
  disc(g, L_BODY, ex, ey, 4); // hand
}

function buildPose(pose: Pose2D): DotGrid {
  if (pose === "typing") {
    // Side view, seated at a desk facing right.
    const g = makeGrid(96, 84);
    // Chair (amber).
    rect(g, L_PROP, 10, 30, 5, 30); // backrest
    rect(g, L_PROP, 10, 58, 26, 5); // seat
    seg(g, L_PROP, 22, 63, 22, 76, 4); // post
    seg(g, L_PROP, 12, 78, 32, 78, 4); // base
    // Person (cyan), facing right.
    disc(g, L_BODY, 26, 18, 8); // head
    seg(g, L_BODY, 26, 26, 26, 56, 12); // torso
    seg(g, L_BODY, 26, 56, 50, 56, 9); // thigh
    seg(g, L_BODY, 50, 56, 50, 76, 8); // shin
    seg(g, L_BODY, 50, 76, 60, 76, 5); // foot
    seg(g, L_BODY, 26, 33, 38, 43, 7); // upper arm
    seg(g, L_BODY, 38, 43, 54, 47, 6); // forearm to keyboard
    disc(g, L_BODY, 54, 47, 4); // hand
    // Desk (amber).
    rect(g, L_PROP, 50, 50, 40, 5); // desktop
    seg(g, L_PROP, 55, 55, 55, 80, 4); // leg
    seg(g, L_PROP, 85, 55, 85, 80, 4); // leg
    rect(g, L_PROP, 52, 44, 14, 4); // keyboard
    // Monitor: amber frame, dim glowing screen.
    rect(g, L_PROP, 64, 24, 20, 26); // frame
    rect(g, L_SCREEN, 67, 27, 14, 18); // screen
    seg(g, L_PROP, 74, 50, 74, 54, 4); // stand
    seg(g, L_SCREEN, 6, 81, 90, 81, 2); // ground line
    return g;
  }

  const g = makeGrid(64, 96);
  const { shoulderL, shoulderR } = standingBody(g);
  const [slx, sly] = shoulderL;
  const [srx, sry] = shoulderR;

  switch (pose) {
    case "welcome": // About — arms open.
      arm(g, slx, sly, 6, 46);
      arm(g, srx, sry, 58, 46);
      break;
    case "waving": // Contact — right arm raised, motion ticks.
      arm(g, slx, sly, 20, 58);
      arm(g, srx, sry, 56, 8);
      seg(g, L_PROP, 61, 14, 66, 10, 2); // wave ticks (amber)
      seg(g, L_PROP, 63, 21, 69, 19, 2);
      break;
    case "reading": // Publications — holding an amber book.
      arm(g, slx, sly, 23, 44);
      arm(g, srx, sry, 41, 44);
      rect(g, L_PROP, 23, 38, 18, 14); // book
      seg(g, L_BODY, 32, 38, 32, 52, 2); // book spine shadow
      break;
    case "building": // Experience/Projects — hammer raised.
      arm(g, slx, sly, 20, 58);
      arm(g, srx, sry, 54, 12);
      seg(g, L_PROP, 54, 12, 64, 2, 4); // hammer handle
      rect(g, L_PROP, 56, 0, 14, 8); // hammer head
      break;
    case "celebrate": // Skills — both arms up in a V.
      arm(g, slx, sly, 10, 8);
      arm(g, srx, sry, 54, 8);
      break;
  }
  return g;
}

// ---------------------------------------------------------------------------
// Braille conversion + pre-render.
// ---------------------------------------------------------------------------

/** Dot offsets within a Braille cell: [dx, dy, bit]. */
const BRAILLE_DOTS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0], // dot 1
  [0, 1, 1], // dot 2
  [0, 2, 2], // dot 3
  [1, 0, 3], // dot 4
  [1, 1, 4], // dot 5
  [1, 2, 5], // dot 6
  [0, 3, 6], // dot 7
  [1, 3, 7], // dot 8
];

function cellMask(g: DotGrid, layer: number, cx: number, cy: number): number {
  let mask = 0;
  for (const [dx, dy, bit] of BRAILLE_DOTS) {
    const x = cx * 2 + dx;
    const y = cy * 4 + dy;
    if (x < g.w && y < g.h && g.layers[layer]![x + y * g.w]) mask |= 1 << bit;
  }
  return mask;
}

const LAYER_COLORS = [BODY, PROP, SCREEN];

function renderPoseToCanvas(pose: Pose2D, w: number, h: number, dpr: number): HTMLCanvasElement {
  const g = buildPose(pose);
  const cols = Math.ceil(g.w / 2);
  const rows = Math.ceil(g.h / 4);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);

  // Fit the Braille grid into the canvas (contain).
  const fontSize = Math.min(w / (0.6 * cols), h / rows);
  const gridW = cols * 0.6 * fontSize;
  const gridH = rows * fontSize;
  const ox = (w - gridW) / 2;
  const oy = (h - gridH) / 2;

  ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textBaseline = "middle";

  // One pass per layer so colors stay pure; screen layer drawn first (under).
  const layerOrder = [L_SCREEN, L_BODY, L_PROP];
  for (const layer of layerOrder) {
    ctx.fillStyle = LAYER_COLORS[layer]!;
    if (layer === L_BODY) {
      ctx.shadowColor = "rgba(47, 216, 255, 0.55)";
      ctx.shadowBlur = fontSize * 0.45;
    } else {
      ctx.shadowBlur = 0;
    }
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        // Priority: screen > prop > body — only the winning layer draws here.
        let mask = 0;
        if (layer === L_SCREEN) mask = cellMask(g, L_SCREEN, c, r);
        else if (layer === L_PROP) {
          if (cellMask(g, L_SCREEN, c, r) === 0) mask = cellMask(g, L_PROP, c, r);
        } else {
          if (cellMask(g, L_SCREEN, c, r) === 0 && cellMask(g, L_PROP, c, r) === 0) {
            mask = cellMask(g, L_BODY, c, r);
          }
        }
        line += mask === 0 ? " " : String.fromCharCode(0x2800 + mask);
      }
      if (line.trim().length > 0) {
        ctx.fillText(line, ox, oy + r * fontSize + fontSize / 2);
      }
    }
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Component.
// ---------------------------------------------------------------------------

const POSES: Pose2D[] = ["typing", "welcome", "reading", "building", "celebrate", "waving"];
const SECTION_IDS = ["home", "about", "publications", "experience", "projects", "skills", "contact"];

export function AsciiPerson2D(): React.JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [asciiActive, setAsciiActive] = useState(false);
  const [wide, setWide] = useState(false);
  const poseRef = useRef<Pose2D>("typing");
  const [, forcePose] = useState<Pose2D>("typing");

  // Gate on ASCII mode + desktop widths.
  useEffect(() => {
    const root = document.documentElement;
    const syncAscii = () => setAsciiActive(root.getAttribute("data-ascii") === "active");
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

  // Track the most-visible section → pose.
  useEffect(() => {
    const ratios = new Map<string, number>();
    const apply = () => {
      let bestId: string | null = null;
      let bestRatio = 0;
      for (const [id, ratio] of ratios) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }
      if (bestId) {
        const next = SECTION_POSE[bestId] ?? "typing";
        if (next !== poseRef.current) {
          poseRef.current = next;
          forcePose(next);
        }
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          ratios.set(id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        apply();
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  const visible = asciiActive && wide;
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Render loop: crossfade between pose canvases + gentle bob.
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 460;
    const H = 600;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    let ready = false;
    const images = new Map<Pose2D, HTMLCanvasElement>();
    const renderAll = () => {
      for (const p of POSES) images.set(p, renderPoseToCanvas(p, W, H, dpr));
      ready = true;
    };
    if (document.fonts?.ready) {
      void document.fonts.ready.then(renderAll);
    } else {
      renderAll();
    }

    let raf = 0;
    let fromPose: Pose2D = poseRef.current;
    let toPose: Pose2D = poseRef.current;
    let blend = 1; // 1 = fully on toPose
    const BLEND_MS = 350;
    let blendStart = 0;

    const draw = (now: number) => {
      const target = poseRef.current;
      if (target !== toPose) {
        fromPose = blend < 1 ? fromPose : toPose;
        toPose = target;
        blend = 0;
        blendStart = now;
      }
      if (blend < 1) {
        blend = reducedMotion ? 1 : Math.min(1, (now - blendStart) / BLEND_MS);
      }
      const bob = reducedMotion ? 0 : Math.sin(now / 900) * 5;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (ready) {
        const fromImg = images.get(fromPose);
        const toImg = images.get(toPose);
        if (fromImg && toImg) {
          if (blend < 1 && fromImg !== toImg) {
            ctx.globalAlpha = 1 - blend;
            ctx.drawImage(fromImg, 0, bob * (1 - blend), W, H);
          }
          ctx.globalAlpha = blend;
          ctx.drawImage(toImg, 0, bob * blend, W, H);
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [visible, reducedMotion]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-ascii-person-2d
      style={{
        position: "fixed",
        right: "max(2.5vw, 20px)",
        top: "50%",
        transform: "translateY(-50%)",
        height: "min(62vh, 600px)",
        width: "auto",
        aspectRatio: "460 / 600",
        zIndex: 4, // above the journey canvas (2), below the content frost (5)
        pointerEvents: "none",
        opacity: 0.95,
        // Soft left-edge fade so the figure never hard-overlaps body copy.
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0%, black 18%, black 100%)",
        maskImage:
          "linear-gradient(90deg, transparent 0%, black 18%, black 100%)",
      }}
    />
  );
}
