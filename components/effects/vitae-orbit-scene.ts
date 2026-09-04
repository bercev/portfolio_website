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

const PAGE_W = 1.55;
const PAGE_H = 2.05;

/**
 * Lightweight Vitae deep-dive mesh — stacked versioned pages / layer-diff energy.
 * No EffectComposer. Grab springs back in ~1s; orbit continues while active.
 */
export class VitaeOrbitScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly root = new THREE.Group();
  private readonly pages: THREE.Group;
  private readonly diffMarks: THREE.Group;
  private readonly dust: THREE.Points;
  private readonly pageLayers: THREE.Group[] = [];
  private readonly pageBases: Array<{ x: number; rotZ: number }> = [];

  private readonly pointer = { x: 0, y: 0, grabbing: false };
  private readonly targetRot = { x: 0.28, y: 0.35 };
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
    this.camera.position.set(0, 0.15, 5.6);

    const accent = new THREE.Color(palette.accent);
    const cyan = new THREE.Color(palette.cyan);
    const emerald = new THREE.Color(palette.emerald);

    this.pages = this.buildPages(accent, cyan, emerald);
    this.diffMarks = this.buildDiffMarks(accent, cyan, emerald);
    this.dust = this.buildDust(22, accent, cyan, emerald);

    this.root.add(this.pages);
    this.root.add(this.diffMarks);
    this.root.add(this.dust);
    this.scene.add(this.root);

    this.handleResize();
    this.bindPointer(canvas);
    this.lastNow = performance.now();
    this.loop(this.lastNow);
  }

  private buildPages(
    accent: THREE.Color,
    cyan: THREE.Color,
    emerald: THREE.Color,
  ) {
    const group = new THREE.Group();
    const layers: Array<{
      tint: THREE.Color;
      z: number;
      x: number;
      y: number;
      rotZ: number;
      opacity: number;
    }> = [
      { tint: emerald, z: -0.22, x: -0.18, y: 0.1, rotZ: -0.08, opacity: 0.38 },
      { tint: cyan, z: -0.08, x: -0.06, y: 0.04, rotZ: -0.03, opacity: 0.52 },
      { tint: accent, z: 0.08, x: 0.08, y: -0.02, rotZ: 0.035, opacity: 0.78 },
    ];

    for (const layer of layers) {
      const pageGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H);
      const layerGroup = new THREE.Group();
      layerGroup.position.set(layer.x, layer.y, layer.z);
      layerGroup.rotation.z = layer.rotZ;

      const page = new THREE.Mesh(
        pageGeo,
        new THREE.MeshBasicMaterial({
          color: layer.tint,
          transparent: true,
          opacity: layer.opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      layerGroup.add(page);

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(pageGeo),
        new THREE.LineBasicMaterial({
          color: layer.tint,
          transparent: true,
          opacity: Math.min(1, layer.opacity + 0.25),
        }),
      );
      outline.position.z = 0.001;
      layerGroup.add(outline);

      group.add(layerGroup);
      this.pageLayers.push(layerGroup);
      this.pageBases.push({ x: layer.x, rotZ: layer.rotZ });
    }

    // Front-page "body copy" proxies — read as document lines in ~1s.
    const lineMat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    for (let i = 0; i < 6; i += 1) {
      const widthScale = i === 0 ? 0.72 : i === 5 ? 0.55 : 1;
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95 * widthScale, 0.045),
        lineMat,
      );
      line.position.set(0.08 + (1 - widthScale) * -0.2, 0.62 - i * 0.2, 0.1);
      group.add(line);
    }

    return group;
  }

  private buildDiffMarks(
    accent: THREE.Color,
    cyan: THREE.Color,
    emerald: THREE.Color,
  ) {
    const group = new THREE.Group();
    const marks: Array<{
      color: THREE.Color;
      y: number;
      h: number;
      x: number;
      z: number;
    }> = [
      { color: emerald, y: 0.55, h: 0.28, x: -0.72, z: 0.12 },
      { color: cyan, y: 0.12, h: 0.42, x: -0.72, z: 0.12 },
      { color: accent, y: -0.38, h: 0.22, x: -0.72, z: 0.12 },
      { color: emerald, y: 0.28, h: 0.18, x: 0.78, z: -0.05 },
      { color: cyan, y: -0.2, h: 0.32, x: 0.78, z: -0.05 },
    ];

    for (const mark of marks) {
      const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(0.07, mark.h),
        new THREE.MeshBasicMaterial({
          color: mark.color,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        }),
      );
      bar.position.set(mark.x, mark.y, mark.z);
      group.add(bar);
    }

    return group;
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
      // Soft cloud around the page stack — "diff crumbs", not orbital ring.
      const side = i % 2 === 0 ? -1 : 1;
      positions[i * 3] = side * (0.95 + (i % 5) * 0.12) + (i % 3) * 0.05;
      positions[i * 3 + 1] = ((i % 7) - 3) * 0.22;
      positions[i * 3 + 2] = ((i % 4) - 1.5) * 0.18;
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
        size: 0.07,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
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
      const restX = 0.28 + Math.sin(this.autoAngle * 0.65) * 0.06;
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
      this.autoAngle += dt * 0.42;
    }

    this.root.rotation.x = this.targetRot.x;
    this.root.rotation.y = this.targetRot.y;

    // Layer-diff breath: pages fan slightly so the stack reads as versions.
    const fan = 0.5 + 0.5 * Math.sin(this.autoAngle * 0.9);
    this.pageLayers.forEach((layer, index) => {
      const base = this.pageBases[index];
      const spread = (index - 1) * 0.035 * fan;
      layer.position.x = base.x + spread;
      layer.rotation.z = base.rotZ + spread * 0.25;
    });
    this.diffMarks.rotation.z = Math.sin(this.autoAngle * 0.7) * 0.04;
    this.dust.rotation.y -= dt * 0.15;

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unbindPointer();
    const disposedGeo = new Set<THREE.BufferGeometry>();
    const disposedMat = new Set<THREE.Material>();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry && !disposedGeo.has(mesh.geometry)) {
        disposedGeo.add(mesh.geometry);
        mesh.geometry.dispose();
      }
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        material.forEach((m) => {
          if (!disposedMat.has(m)) {
            disposedMat.add(m);
            m.dispose();
          }
        });
      } else if (material && !disposedMat.has(material)) {
        disposedMat.add(material);
        material.dispose();
      }
    });
    this.renderer.dispose();
  }
}
