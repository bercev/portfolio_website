import * as THREE from "three";

type ParticleTextSceneOptions = {
  canvas: HTMLCanvasElement;
  colors: readonly string[];
  /**
   * Text source: sampled from a filled 2D render of the word. Required
   * unless `image` is given.
   */
  fontFamily?: string;
  text?: string;
  /**
   * Image source (run 9, RUN9-PARTICLE-PORTRAIT): a loaded
   * HTMLImageElement sampled by luminance instead of a text render —
   * the GATHER treatment of the portrait bust. Mutually exclusive with
   * `text`/`fontFamily`; one source is required.
   */
  image?: HTMLImageElement;
  /**
   * Cap on the point cloud (default 14_000). The bust's 200–300px box
   * needs fewer points than the BERAT wordmark; pass a lower cap there.
   */
  maxParticles?: number;
  /**
   * Pointer-repulsion radius in canvas px (default 150, the BERAT
   * value). The bust's 300px box needs a face-scale crater — 150 eats
   * ~55% of the head and reads as a donut (round-2 critic note).
   */
  mouseRadius?: number;
  /**
   * Live yaw source (radians) for the whole cloud, read every frame
   * and composed with the idle sway — the bust's scroll turn. Defaults
   * to 0 (the wordmark never turns).
   */
  yawSource?: () => number;
  /**
   * When true, particles start scattered across the canvas and ease into
   * the letterforms (the GATHER entrance: the word assembles from chaos
   * instead of appearing formed). Default false (formed at rest).
   */
  assemble?: boolean;
  /**
   * Fired once, when the assembly has landed (every particle within ~2px
   * of its origin). Lets the wrapper draw settled-state furniture — the
   * hero measurement frame — exactly when the wordmark is formed, instead
   * of guessing with a wall-clock delay (headless rAF runs slow).
   */
  onSettled?: () => void;
};

/** Canvas-pixel bounds of the letterforms (origins are centered coords). */
export type LetterBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** Pure bounds computation, unit-tested without WebGL. */
export function letterBoundsFromOrigins(
  origins: Float32Array,
  width: number,
  height: number,
): LetterBounds | null {
  if (origins.length < 3) return null;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < origins.length; index += 3) {
    const x = origins[index];
    const y = origins[index + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) return null;
  // Origins are centered with y up; canvas coords have y down.
  return {
    left: minX + width / 2,
    top: height / 2 - maxY,
    right: maxX + width / 2,
    bottom: height / 2 - minY,
  };
}

const MAX_PARTICLES = 14_000;
/** Luminance floor for image sampling — matches the ASCII bust's skip. */
const IMAGE_LUM_THRESHOLD = 0.05;
/** Relief depth (px) across the full luminance range of an image source. */
const IMAGE_DEPTH_SCALE = 48;

export type ImageSample = {
  /** Centered, y-up origins (x, y, depth-from-luminance triples). */
  origins: Float32Array;
  /** Per-point luminance 0..1, parallel to origins. */
  luminances: Float32Array;
};

/**
 * Pure image→point-cloud sampling, unit-tested without WebGL. Luminance
 * comes from the red channel (the portrait source is monochrome); pixels
 * at or below `threshold` are skipped (crushed background); depth is the
 * luminance relief, so the cloud reads as a sculpture when it turns.
 */
export function sampleImagePoints(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  gap: number,
  threshold: number = IMAGE_LUM_THRESHOLD,
  depthScale: number = IMAGE_DEPTH_SCALE,
): ImageSample {
  const origins: number[] = [];
  const luminances: number[] = [];
  for (let y = 0; y < height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      const lum = imageData[(y * width + x) * 4] / 255;
      if (lum <= threshold) continue;
      origins.push(x - width / 2, height / 2 - y, (lum - 0.5) * depthScale);
      luminances.push(lum);
    }
  }
  return {
    origins: Float32Array.from(origins),
    luminances: Float32Array.from(luminances),
  };
}

/**
 * Histogram stretch for image sources: remap the kept luminances to the
 * full [0,1] range by their observed min/max, so the palette gradient
 * spans the face's actual tonal range instead of the slice the source
 * happens to occupy. The portrait's kept pixels run 0.365–1.0 with 40%
 * crammed into 0.4–0.5 — without the stretch, most of the face renders
 * one gradient step and reads as a featureless dome (round-2 critic
 * D2). Depth keeps the raw luminance; only the color is stretched.
 * Pure, unit-tested. Identity on a flat or empty input.
 */
export function normalizeLuminances(luminances: Float32Array): Float32Array {
  if (luminances.length === 0) return luminances;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const lum of luminances) {
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }
  if (!(max > min)) return luminances;
  const out = new Float32Array(luminances.length);
  for (let i = 0; i < luminances.length; i++) {
    out[i] = (luminances[i] - min) / (max - min);
  }
  return out;
}
export function gradientColorHex(colors: readonly string[], t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));
  const frac = scaled - index;
  const parse = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const a = parse(colors[index]);
  const b = parse(colors[index + 1]);
  const channel = (i: number) =>
    Math.round(a[i] + (b[i] - a[i]) * frac)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

/** Pure idle sway (radians) — the cloud breathes ±~3° around its yaw. */
export function swayYaw(elapsedMs: number): number {
  return Math.sin(elapsedMs * 0.00025) * 0.05;
}
const MOUSE_RADIUS = 150;
const MOUSE_STRENGTH = 5;
const FRICTION = 0.75;
const EASE = 0.05;
const CSS_SRGB_COLOR =
  /^color\(srgb\s+(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s*\)$/i;

export function normalizeParticleColor(color: string) {
  const match = CSS_SRGB_COLOR.exec(color);
  if (!match) return color;

  const channels = match.slice(1).map((channel) =>
    Math.round(Math.min(1, Math.max(0, Number(channel))) * 255),
  );
  return `rgb(${channels.join(", ")})`;
}

export class ParticleTextScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly colors: readonly string[];
  private readonly fontFamily: string | undefined;
  private readonly text: string | undefined;
  private readonly image: HTMLImageElement | undefined;
  private readonly maxParticles: number;
  private readonly mouseRadius: number;
  private readonly yawSource: (() => number) | undefined;
  private readonly assemble: boolean;
  private readonly onSettled?: () => void;
  private settledFired = false;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly renderer: THREE.WebGLRenderer;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private points: THREE.Points | null = null;
  private origins = new Float32Array();
  private velocities = new Float32Array();
  private animationFrame = 0;
  private pointerX = Number.POSITIVE_INFINITY;
  private pointerY = Number.POSITIVE_INFINITY;
  private startedAt = performance.now();

  constructor({ canvas, colors, fontFamily, text, image, maxParticles, mouseRadius, yawSource, assemble = false, onSettled }: ParticleTextSceneOptions) {
    if (!image && !text) {
      throw new Error("ParticleTextScene requires a text or image source");
    }
    this.canvas = canvas;
    this.colors = colors;
    this.fontFamily = fontFamily;
    this.text = text;
    this.image = image;
    this.maxParticles = maxParticles ?? MAX_PARTICLES;
    this.mouseRadius = mouseRadius ?? MOUSE_RADIUS;
    this.yawSource = yawSource;
    this.assemble = assemble;
    this.onSettled = onSettled;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      canvas,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // Pointer input is window-level, not canvas-level: the bust lives
    // under a pointer-events:none wrapper (it must never block clicks on
    // the copy beneath it), so its canvas never receives pointer events.
    // The handler maps the pointer into canvas coords and the animation
    // loop's distance gate (MOUSE_RADIUS) ignores pointers far away, so
    // a window listener behaves identically for the BERAT canvas — whose
    // pointer-events:auto band already covered the same area — and is the
    // only way the bust's repulsion field ever fires.
    window.addEventListener("pointermove", this.handlePointerMove);
    document.documentElement.addEventListener(
      "pointerleave",
      this.handlePointerLeave,
    );
    document.addEventListener("visibilitychange", this.handlePointerGone);
  }

  start() {
    this.resize();
    this.startedAt = performance.now();
    this.animate();
  }

  resize() {
    const width = Math.max(1, Math.round(this.canvas.clientWidth));
    const height = Math.max(1, Math.round(this.canvas.clientHeight));
    this.renderer.setSize(width, height, false);

    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.near = 0.1;
    this.camera.far = 1_000;
    this.camera.position.z = 500;
    this.camera.updateProjectionMatrix();

    this.buildParticles(width, height);
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("pointermove", this.handlePointerMove);
    document.documentElement.removeEventListener(
      "pointerleave",
      this.handlePointerLeave,
    );
    document.removeEventListener("visibilitychange", this.handlePointerGone);
    this.clearParticles();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private buildParticles(width: number, height: number) {
    this.clearParticles();

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = width;
    sampleCanvas.height = height;
    const context = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Particle Text requires a 2D canvas context");

    // Run 9: the wordmark must keep the ASCII BERAT's presence — the
    // 220px cap rendered the particle word ~24% narrower (630px vs 831px
    // measured). 300px at 0.78 of box height lands ~856px desktop; mobile
    // stays width-constrained, so it is unchanged there.
    const gap = 3; // Denser sampling punches the wordmark up at 390px
    // (mobile count stays ~1.5k, far under the cap); the bust's small
    // box needs the same density to read as a face, not a sparse cloud.
    const samples: Array<[number, number, number]> = [];
    // Parallel luminance per sample for image sources (null for text).
    let sampleLums: number[] | null = null;
    if (this.image) {
      // Image source: sample at the image's NATIVE resolution (gap 1 in
      // source pixels, origins scaled to the canvas) — sampling the
      // upscaled 300px draw at gap 3 aliased against the 84px source
      // (3.57x upscale) and banded the settled face (round 1). The old
      // ASCII renderer sampled the same 84x84 grid.
      const iw = this.image.naturalWidth || width;
      const ih = this.image.naturalHeight || height;
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = iw;
      srcCanvas.height = ih;
      const srcContext = srcCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!srcContext) throw new Error("Particle Text requires a 2D canvas context");
      srcContext.drawImage(this.image, 0, 0);
      const imageData = srcContext.getImageData(0, 0, iw, ih).data;
      const sampled = sampleImagePoints(imageData, iw, ih, 1);
      const scaleX = width / iw;
      const scaleY = height / ih;
      for (let i = 0; i < sampled.origins.length; i += 3) {
        samples.push([
          sampled.origins[i] * scaleX,
          sampled.origins[i + 1] * scaleY,
          sampled.origins[i + 2],
        ]);
      }
      // Color uses the histogram-stretched luminance (round 3) so the
      // gradient spans the face; depth keeps the raw relief.
      sampleLums = Array.from(normalizeLuminances(sampled.luminances));
    } else {
      const maximumFontSize = Math.min(300, height * 0.78);
      context.font = `800 ${maximumFontSize}px ${this.fontFamily}`;
      const measuredWidth = Math.max(1, context.measureText(this.text ?? "").width);
      const fontSize = Math.min(maximumFontSize, maximumFontSize * ((width * 0.9) / measuredWidth));
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#fff";
      context.font = `800 ${fontSize}px ${this.fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText((this.text ?? "").toUpperCase(), width / 2, height / 2);

      const imageData = context.getImageData(0, 0, width, height).data;
      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          if (imageData[(y * width + x) * 4 + 3] > 128) {
            const depth = Math.sin(x * 0.037 + y * 0.021) * 16;
            samples.push([x - width / 2, height / 2 - y, depth]);
          }
        }
      }
    }

    const stride = Math.max(1, Math.ceil(samples.length / this.maxParticles));
    const particleCount = Math.ceil(samples.length / stride);
    const positions = new Float32Array(particleCount * 3);
    const colorValues = new Float32Array(particleCount * 3);
    const palette = this.colors.map(
      (color) => new THREE.Color(normalizeParticleColor(color)),
    );

    let targetIndex = 0;
    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += stride) {
      const sample = samples[sampleIndex];
      const offset = targetIndex * 3;
      positions[offset] = sample[0];
      positions[offset + 1] = sample[1];
      positions[offset + 2] = sample[2];

      // Image sources keep their shading as a smooth gradient: the color
      // walks the palette stops with luminance, so the face's tonal
      // gradation survives instead of quantizing into contour bands.
      // Text keeps its position-hash speckle.
      const color =
        sampleLums !== null
          ? new THREE.Color(
              normalizeParticleColor(
                gradientColorHex(this.colors, sampleLums[sampleIndex]),
              ),
            )
          : palette[
              Math.floor(
                (Math.abs(
                  Math.sin(sample[0] * 12.9898 + sample[1] * 78.233) *
                    43_758.5453,
                ) %
                  1) *
                  palette.length,
              )
            ];
      colorValues[offset] = color.r;
      colorValues[offset + 1] = color.g;
      colorValues[offset + 2] = color.b;
      targetIndex += 1;
    }

    this.origins = positions.slice();
    this.canvasWidth = width;
    this.canvasHeight = height;
    // A rebuild (resize) re-scatters when assembling; re-arm the settled
    // signal so a fresh assembly can report its landing again.
    this.settledFired = false;
    if (this.assemble) {
      // Scatter the live positions across the canvas; the animation loop's
      // EASE pull toward origins assembles the letters over ~1–2s. Origins
      // (the letterforms) stay untouched, so the word always settles exact.
      for (let scatterIndex = 0; scatterIndex < positions.length; scatterIndex += 3) {
        positions[scatterIndex] = (Math.random() * 2 - 1) * (width / 2);
        positions[scatterIndex + 1] = (Math.random() * 2 - 1) * (height / 2);
        positions[scatterIndex + 2] = (Math.random() * 2 - 1) * 80;
      }
    }
    this.velocities = new Float32Array(positions.length);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colorValues, 3));
    this.material = new THREE.PointsMaterial({
      size: width < 720 ? 2.4 : 2.1,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.96,
      vertexColors: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  /** Canvas-pixel bounds of the settled letterforms, or null pre-build. */
  getLetterBounds(): LetterBounds | null {
    return letterBoundsFromOrigins(this.origins, this.canvasWidth, this.canvasHeight);
  }

  private clearParticles() {
    if (this.points) this.scene.remove(this.points);
    this.geometry?.dispose();
    this.material?.dispose();
    this.points = null;
    this.geometry = null;
    this.material = null;
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointerX = event.clientX - bounds.left - bounds.width / 2;
    this.pointerY = bounds.height / 2 - (event.clientY - bounds.top);
  };

  private readonly handlePointerLeave = () => {
    this.pointerX = Number.POSITIVE_INFINITY;
    this.pointerY = Number.POSITIVE_INFINITY;
  };

  // A hidden tab has no pointer in the window — ease back to the scroll
  // pose instead of holding a stale repulsion.
  private readonly handlePointerGone = () => {
    if (document.visibilityState === "hidden") this.handlePointerLeave();
  };

  private readonly animate = () => {
    const positionAttribute = this.geometry?.getAttribute("position");
    if (positionAttribute instanceof THREE.BufferAttribute) {
      const positions = positionAttribute.array as Float32Array;
      const elapsed = performance.now() - this.startedAt;
      // Largest remaining assembly distance this frame; the settled signal
      // fires once every particle is home (pointer bursts after landing do
      // not retract it — the frame marks the plate, not the particles).
      let maxHome = 0;

      for (let index = 0; index < positions.length; index += 3) {
        const dx = positions[index] - this.pointerX;
        const dy = positions[index + 1] - this.pointerY;
        const distance = Math.hypot(dx, dy);

        if (distance < this.mouseRadius && distance > 0) {
          const force = (1 - distance / this.mouseRadius) * MOUSE_STRENGTH;
          this.velocities[index] += (dx / distance) * force;
          this.velocities[index + 1] += (dy / distance) * force;
          this.velocities[index + 2] += force * 0.35;
        }

        this.velocities[index] *= FRICTION;
        this.velocities[index + 1] *= FRICTION;
        this.velocities[index + 2] *= FRICTION;
        positions[index] += this.velocities[index];
        positions[index + 1] += this.velocities[index + 1];
        positions[index + 2] += this.velocities[index + 2];
        // Return home with a distance-gated ease: far-flung particles
        // (fresh scatter, pointer bursts) snap back briskly at 0.12, then
        // settle gently at EASE 0.05 — so the load assembly reads as a
        // sweep that lands, not a slow drift.
        const homeX = this.origins[index] - positions[index];
        const homeY = this.origins[index + 1] - positions[index + 1];
        const homeDist = Math.abs(homeX) + Math.abs(homeY);
        if (homeDist > maxHome) maxHome = homeDist;
        const homeEase =
          Math.abs(homeX) > 40 || Math.abs(homeY) > 40 ? 0.12 : EASE;
        positions[index] += homeX * homeEase;
        positions[index + 1] += homeY * homeEase;
        const idleDepth =
          this.origins[index + 2] + Math.sin(elapsed * 0.0015 + index * 0.013) * 3;
        positions[index + 2] += (idleDepth - positions[index + 2]) * EASE;
      }

      positionAttribute.needsUpdate = true;

      if (this.assemble && !this.settledFired && maxHome < 2.5) {
        this.settledFired = true;
        this.onSettled?.();
      }
    }

    if (this.points) {
      // Run 9: the settled wordmark must read as ALIVE, not a static
      // texture swap — a slow ±~3° sway (was ±2°) keeps the resting hero
      // visibly breathing while the letters stay legible. The bust composes
      // the same sway onto its live scroll-turn yaw (0 when no yaw source
      // is given, so the wordmark is untouched).
      const yaw = this.yawSource ? this.yawSource() : 0;
      this.points.rotation.y = yaw + swayYaw(performance.now() - this.startedAt);
      // Observability (same quantized pattern as the old bust's
      // data-glance): the live scroll-turn yaw in milliradians, so
      // probes gate on the component's own value instead of the frame.
      // Exactly "0" at the hero; ~"1000" at mid-scroll; back to "0" at
      // contact (the turn-back). Only written when a yaw source exists.
      if (this.yawSource) {
        const yq = String(Math.round(yaw * 1000));
        if (this.canvas.dataset.yaw !== yq) this.canvas.dataset.yaw = yq;
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.animate);
  };
}
