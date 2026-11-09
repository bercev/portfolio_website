import * as THREE from "three";

type ParticleTextSceneOptions = {
  canvas: HTMLCanvasElement;
  colors: readonly string[];
  fontFamily: string;
  text: string;
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
  private readonly fontFamily: string;
  private readonly text: string;
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

  constructor({ canvas, colors, fontFamily, text, assemble = false, onSettled }: ParticleTextSceneOptions) {
    this.canvas = canvas;
    this.colors = colors;
    this.fontFamily = fontFamily;
    this.text = text;
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

    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
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
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
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
    const maximumFontSize = Math.min(300, height * 0.78);
    context.font = `800 ${maximumFontSize}px ${this.fontFamily}`;
    const measuredWidth = Math.max(1, context.measureText(this.text).width);
    const fontSize = Math.min(maximumFontSize, maximumFontSize * ((width * 0.9) / measuredWidth));
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fff";
    context.font = `800 ${fontSize}px ${this.fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(this.text.toUpperCase(), width / 2, height / 2);

    const imageData = context.getImageData(0, 0, width, height).data;
    // Run 9: gap 3 everywhere — the mobile gap-4 letters read thin next
    // to the ASCII BERAT; denser sampling punches the wordmark up at 390px
    // (mobile count stays ~1.5k, far under the cap).
    const gap = 3;
    const samples: Array<[number, number, number]> = [];

    for (let y = 0; y < height; y += gap) {
      for (let x = 0; x < width; x += gap) {
        if (imageData[(y * width + x) * 4 + 3] > 128) {
          const depth = Math.sin(x * 0.037 + y * 0.021) * 16;
          samples.push([x - width / 2, height / 2 - y, depth]);
        }
      }
    }

    const stride = Math.max(1, Math.ceil(samples.length / MAX_PARTICLES));
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

      const colorHash =
        Math.abs(Math.sin(sample[0] * 12.9898 + sample[1] * 78.233) * 43_758.5453) %
        1;
      const color = palette[Math.floor(colorHash * palette.length)];
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

        if (distance < MOUSE_RADIUS && distance > 0) {
          const force = (1 - distance / MOUSE_RADIUS) * MOUSE_STRENGTH;
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
      // visibly breathing while the letters stay legible.
      this.points.rotation.y = Math.sin((performance.now() - this.startedAt) * 0.00025) * 0.05;
    }
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.animate);
  };
}
