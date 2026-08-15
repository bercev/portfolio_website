import * as THREE from "three";

import { imageDataToAscii } from "@/lib/ascii-frame";

// Adapted for this site from React Bits ASCIIText.
// Copyright (c) 2026 David Haz. Used under the MIT + Commons Clause License.
const vertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uWaveStrength;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    float time = uTime * 5.0;

    transformed.x += sin(time + position.y) * 0.5 * uWaveStrength;
    transformed.y += cos(time + position.z) * 0.15 * uWaveStrength;
    transformed.z += sin(time + position.x) * uWaveStrength;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform sampler2D uTexture;

  void main() {
    vec2 position = vUv;
    float move = sin(uTime) * 0.006;
    float red = texture2D(uTexture, position + vec2(move, 0.0)).r;
    float green = texture2D(uTexture, position).g;
    float blue = texture2D(uTexture, position - vec2(move, 0.0)).b;
    float alpha = texture2D(uTexture, position).a;

    gl_FragColor = vec4(red, green, blue, alpha);
  }
`;

type AsciiSceneOptions = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  sampleCanvas: HTMLCanvasElement;
  output: HTMLPreElement;
  text: string;
  animated: boolean;
  interactive: boolean;
  cellSize: number;
};

function cssValue(element: HTMLElement, name: string, fallback: string) {
  return getComputedStyle(element).getPropertyValue(name).trim() || fallback;
}

function mapRange(
  value: number,
  inputStart: number,
  inputEnd: number,
  outputStart: number,
  outputEnd: number,
) {
  const progress = (value - inputStart) / Math.max(1, inputEnd - inputStart);
  return outputStart + progress * (outputEnd - outputStart);
}

export class AsciiScene {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly sampleCanvas: HTMLCanvasElement;
  private readonly output: HTMLPreElement;
  private readonly text: string;
  private readonly animated: boolean;
  private readonly interactive: boolean;
  private readonly cellSize: number;
  private readonly sampleContext: CanvasRenderingContext2D;
  private readonly textCanvas: HTMLCanvasElement;
  private readonly textContext: CanvasRenderingContext2D;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly texture: THREE.CanvasTexture;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly resizeObserver: ResizeObserver;
  private animationFrame = 0;
  private lastFrameTime = 0;
  private width = 1;
  private height = 1;
  private pointer = { x: 0.5, y: 0.5 };
  private disposed = false;

  constructor({
    root,
    canvas,
    sampleCanvas,
    output,
    text,
    animated,
    interactive,
    cellSize,
  }: AsciiSceneOptions) {
    const sampleContext = sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    const textCanvas = document.createElement("canvas");
    const textContext = textCanvas.getContext("2d");

    if (!sampleContext || !textContext) {
      throw new Error("ASCII canvas contexts are unavailable.");
    }

    this.root = root;
    this.canvas = canvas;
    this.sampleCanvas = sampleCanvas;
    this.output = output;
    this.text = text;
    this.animated = animated;
    this.interactive = interactive;
    this.cellSize = Math.max(6, cellSize);
    this.sampleContext = sampleContext;
    this.textCanvas = textCanvas;
    this.textContext = textContext;

    this.drawTextTexture();
    this.texture = new THREE.CanvasTexture(this.textCanvas);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;

    const textAspect = this.textCanvas.width / this.textCanvas.height;
    this.geometry = new THREE.PlaneGeometry(textAspect, 1, 36, 36);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: this.texture },
        uWaveStrength: { value: animated ? 0.22 : 0 },
      },
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);

    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
    this.camera.position.z = 30;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      canvas,
      powerPreference: "low-power",
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));

    this.handlePointerMove = this.handlePointerMove.bind(this);
    if (interactive) root.addEventListener("pointermove", this.handlePointerMove);

    this.resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      this.resize(entry.contentRect.width, entry.contentRect.height);
    });
    this.resizeObserver.observe(root);

    const bounds = root.getBoundingClientRect();
    this.resize(bounds.width, bounds.height);
  }

  private drawTextTexture() {
    const fontFamily = cssValue(this.root, "--font-archivo", "sans-serif");
    const foreground = cssValue(this.root, "--foreground", "currentColor");
    const fontSize = 240;
    const font = `800 ${fontSize}px ${fontFamily}`;

    this.textContext.font = font;
    const metrics = this.textContext.measureText(this.text);
    const width = Math.ceil(metrics.width) + 48;
    const height =
      Math.ceil(
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
      ) + 48;

    this.textCanvas.width = width;
    this.textCanvas.height = height;
    this.textContext.clearRect(0, 0, width, height);
    this.textContext.font = font;
    this.textContext.fillStyle = foreground;
    this.textContext.textBaseline = "alphabetic";
    this.textContext.fillText(
      this.text,
      24,
      24 + metrics.actualBoundingBoxAscent,
    );
  }

  private handlePointerMove(event: PointerEvent) {
    const bounds = this.root.getBoundingClientRect();
    this.pointer = {
      x: (event.clientX - bounds.left) / Math.max(1, bounds.width),
      y: (event.clientY - bounds.top) / Math.max(1, bounds.height),
    };
  }

  private resize(width: number, height: number) {
    if (width <= 0 || height <= 0 || this.disposed) return;

    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);

    const columns = Math.max(1, Math.floor(width / (this.cellSize * 0.62)));
    const rows = Math.max(1, Math.floor(height / this.cellSize));
    this.sampleCanvas.width = columns;
    this.sampleCanvas.height = rows;
    this.root.style.setProperty("--ascii-cell-size", `${this.cellSize}px`);

    const visibleHeight =
      2 *
      this.camera.position.z *
      Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const visibleWidth = visibleHeight * this.camera.aspect;
    const textAspect = this.textCanvas.width / this.textCanvas.height;
    const planeHeight = Math.min(
      12,
      visibleHeight * 0.68,
      (visibleWidth * 0.88) / textAspect,
    );
    this.mesh.scale.set(planeHeight, planeHeight, 1);

    this.renderOnce();
  }

  private updateRotation() {
    if (!this.interactive) {
      this.mesh.rotation.x *= 0.92;
      this.mesh.rotation.y *= 0.92;
      return;
    }

    const targetX = mapRange(this.pointer.y, 0, 1, 0.28, -0.28);
    const targetY = mapRange(this.pointer.x, 0, 1, -0.28, 0.28);
    this.mesh.rotation.x += (targetX - this.mesh.rotation.x) * 0.06;
    this.mesh.rotation.y += (targetY - this.mesh.rotation.y) * 0.06;
  }

  renderOnce(time = performance.now()) {
    if (this.disposed || this.width <= 0 || this.height <= 0) return;

    this.material.uniforms.uTime.value = time * 0.001;
    this.updateRotation();
    this.renderer.render(this.scene, this.camera);

    const width = this.sampleCanvas.width;
    const height = this.sampleCanvas.height;
    this.sampleContext.clearRect(0, 0, width, height);
    this.sampleContext.drawImage(this.canvas, 0, 0, width, height);
    const frame = this.sampleContext.getImageData(0, 0, width, height);
    this.output.textContent = imageDataToAscii({
      data: frame.data,
      width,
      height,
      cellSize: 1,
    });
  }

  private animate = (time: number) => {
    if (this.disposed) return;

    if (time - this.lastFrameTime >= 1000 / 30) {
      this.renderOnce(time);
      this.lastFrameTime = time;
    }

    this.animationFrame = requestAnimationFrame(this.animate);
  };

  start() {
    if (this.animated) {
      this.animationFrame = requestAnimationFrame(this.animate);
    } else {
      this.renderOnce();
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.root.removeEventListener("pointermove", this.handlePointerMove);
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.renderer.dispose();
  }
}
