import * as THREE from "three";

export type VitaeOrbitPalette = {
  readonly accent: string;
  readonly cyan: string;
  readonly emerald: string;
};

export type VitaeOrbitSceneOptions = {
  readonly canvas: HTMLCanvasElement;
  readonly palette: VitaeOrbitPalette;
};

/**
 * Lightweight Vitae deep-dive mesh — no post composer.
 * Grab springs back in ~1s; orbit continues while active.
 */
export class VitaeOrbitScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly root = new THREE.Group();
  private readonly core: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly dust: THREE.Points;

  private readonly pointer = { x: 0, y: 0, grabbing: false };
  private readonly targetRot = { x: 0.35, y: 0.4 };
  private readonly velocity = { x: 0, y: 0 };
  private readonly spring = { stiffness: 18, damping: 8 };

  private raf = 0;
  private disposed = false;
  private paused = false;
  private lastNow = 0;
  private autoAngle = 0;

  constructor(options: VitaeOrbitSceneOptions) {
    const { canvas, palette } = options;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
    this.camera.position.set(0, 0.35, 6.2);

    const accent = new THREE.Color(palette.accent);
    const cyan = new THREE.Color(palette.cyan);
    const emerald = new THREE.Color(palette.emerald);

    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.15, 0),
      new THREE.MeshBasicMaterial({
        color: accent,
        wireframe: true,
        transparent: true,
        opacity: 0.82,
      }),
    );
    this.root.add(this.core);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.045, 10, 64),
      new THREE.MeshBasicMaterial({
        color: cyan,
        transparent: true,
        opacity: 0.7,
      }),
    );
    this.ring.rotation.x = Math.PI / 2.4;
    this.root.add(this.ring);

    const satellite = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshBasicMaterial({
        color: emerald,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
      }),
    );
    satellite.position.set(2.15, 0.2, 0);
    this.root.add(satellite);

    this.dust = this.buildDust(28, accent, cyan, emerald);
    this.root.add(this.dust);
    this.scene.add(this.root);

    this.handleResize();
    this.bindPointer(canvas);
    this.lastNow = performance.now();
    this.loop(this.lastNow);
  }

  private buildDust(
    count: number,
    accent: THREE.Color,
    cyan: THREE.Color,
    emerald: THREE.Color,
  ) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const stops = [accent, cyan, emerald];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2.35 + (i % 3) * 0.18;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle * 1.7) * 0.45;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.55;
      const tint = stops[i % stops.length];
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
  }

  private bindPointer(canvas: HTMLCanvasElement) {
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      this.pointer.grabbing = true;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!this.pointer.grabbing) return;
      const dx = event.clientX - this.pointer.x;
      const dy = event.clientY - this.pointer.y;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.velocity.y += dx * 0.004;
      this.velocity.x += dy * 0.004;
      this.targetRot.y += dx * 0.008;
      this.targetRot.x += dy * 0.008;
    };
    const onUp = (event: PointerEvent) => {
      if (!this.pointer.grabbing) return;
      this.pointer.grabbing = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("lostpointercapture", onUp);

    this.unbindPointer = () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("lostpointercapture", onUp);
    };
  }

  private unbindPointer: () => void = () => undefined;

  private readonly handleResize = () => {
    const canvas = this.renderer.domElement;
    const width = Math.max(canvas.clientWidth || 1, 1);
    const height = Math.max(canvas.clientHeight || 1, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  resize() {
    this.handleResize();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused && !this.disposed && this.raf === 0) {
      this.lastNow = performance.now();
      this.loop(this.lastNow);
    }
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    if (this.paused) {
      this.raf = 0;
      return;
    }

    const rawDt = (now - this.lastNow) / 1000;
    this.lastNow = now;
    const dt = Number.isFinite(rawDt) && rawDt > 0 ? Math.min(rawDt, 0.05) : 1 / 60;

    if (!this.pointer.grabbing) {
      // ~1s spring return toward gentle auto-orbit pose.
      const restY = this.autoAngle;
      const restX = 0.35 + Math.sin(this.autoAngle * 0.65) * 0.08;
      const ax =
        (restX - this.targetRot.x) * this.spring.stiffness -
        this.velocity.x * this.spring.damping;
      const ay =
        (restY - this.targetRot.y) * this.spring.stiffness -
        this.velocity.y * this.spring.damping;
      this.velocity.x += ax * dt;
      this.velocity.y += ay * dt;
      this.targetRot.x += this.velocity.x * dt;
      this.targetRot.y += this.velocity.y * dt;
      this.autoAngle += dt * 0.55;
    }

    this.root.rotation.x = this.targetRot.x;
    this.root.rotation.y = this.targetRot.y;
    this.ring.rotation.z += dt * 0.35;
    this.dust.rotation.y -= dt * 0.2;

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unbindPointer();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    this.renderer.dispose();
  }
}
