import * as THREE from "three";

type ParticleTextSceneOptions = {
  canvas: HTMLCanvasElement;
  colors: readonly string[];
  fontFamily: string;
  text: string;
};

const MAX_PARTICLES = 14_000;
const MOUSE_RADIUS = 150;
const MOUSE_STRENGTH = 5;
const FRICTION = 0.75;
const EASE = 0.05;

export class ParticleTextScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly colors: readonly string[];
  private readonly fontFamily: string;
  private readonly text: string;
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

  constructor({ canvas, colors, fontFamily, text }: ParticleTextSceneOptions) {
    this.canvas = canvas;
    this.colors = colors;
    this.fontFamily = fontFamily;
    this.text = text;
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

    const maximumFontSize = Math.min(220, height * 0.72);
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
    const gap = width < 720 ? 4 : 3;
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
    const palette = this.colors.map((color) => new THREE.Color(color));

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
        positions[index] += (this.origins[index] - positions[index]) * EASE;
        positions[index + 1] +=
          (this.origins[index + 1] - positions[index + 1]) * EASE;
        const idleDepth =
          this.origins[index + 2] + Math.sin(elapsed * 0.0015 + index * 0.013) * 2;
        positions[index + 2] += (idleDepth - positions[index + 2]) * EASE;
      }

      positionAttribute.needsUpdate = true;
    }

    if (this.points) {
      this.points.rotation.y = Math.sin((performance.now() - this.startedAt) * 0.00025) * 0.035;
    }
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.animate);
  };
}
