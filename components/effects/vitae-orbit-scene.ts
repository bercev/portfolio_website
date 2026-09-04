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

type PageBase = {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
};

/**
 * Lightweight Vitae deep-dive mesh — stacked versioned pages / layer-diff energy.
 * No EffectComposer. Grab springs back in ~1s with page-flutter; orbit continues while active.
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
  private readonly pageBases: PageBase[] = [];

  private readonly pointer = { x: 0, y: 0, grabbing: false };
  private readonly targetRot = { x: 0.28, y: 0.35 };
  private readonly velocity = { x: 0, y: 0 };
  private readonly spring = { stiffness: 18, damping: 8 };

  private raf = 0;
  private disposed = false;
  private paused = false;
  private lastNow = 0;
  private autoAngle = 0;
  /** Grab page-flutter envelope; springs toward 0 in ~1s. */
  private flutter = 0;
  private flutterVel = 0;

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
    // 3–4 stacked page planes with yaw/pitch offset so the stack reads as versions.
    const layers: Array<{
      tint: THREE.Color;
      x: number;
      y: number;
      z: number;
      rotX: number;
      rotY: number;
      rotZ: number;
      opacity: number;
    }> = [
      {
        tint: emerald,
        x: -0.22,
        y: 0.12,
        z: -0.28,
        rotX: -0.07,
        rotY: 0.11,
        rotZ: -0.09,
        opacity: 0.32,
      },
      {
        tint: cyan,
        x: -0.1,
        y: 0.06,
        z: -0.14,
        rotX: -0.03,
        rotY: 0.05,
        rotZ: -0.04,
        opacity: 0.46,
      },
      {
        tint: accent,
        x: 0.04,
        y: 0.01,
        z: 0.0,
        rotX: 0.015,
        rotY: -0.02,
        rotZ: 0.02,
        opacity: 0.64,
      },
      {
        tint: accent,
        x: 0.14,
        y: -0.04,
        z: 0.14,
        rotX: 0.05,
        rotY: -0.08,
        rotZ: 0.045,
        opacity: 0.86,
      },
    ];

    for (const layer of layers) {
      const pageGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H);
      const layerGroup = new THREE.Group();
      layerGroup.position.set(layer.x, layer.y, layer.z);
      layerGroup.rotation.set(layer.rotX, layer.rotY, layer.rotZ);

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

      // Edge-diff accent outline.
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
      this.pageBases.push({
        x: layer.x,
        y: layer.y,
        z: layer.z,
        rotX: layer.rotX,
        rotY: layer.rotY,
        rotZ: layer.rotZ,
      });
    }

    // Front-page "body copy" proxies — read as document lines.
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
      line.position.set(0.12 + (1 - widthScale) * -0.2, 0.58 - i * 0.2, 0.16);
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
      { color: emerald, y: 0.55, h: 0.28, x: -0.72, z: 0.16 },
      { color: cyan, y: 0.12, h: 0.42, x: -0.72, z: 0.16 },
      { color: accent, y: -0.38, h: 0.22, x: -0.72, z: 0.16 },
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
      this.pointer.grabbing = true;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      // Kick page-flutter envelope on grab; spring settles ~1s.
      this.flutter = 1;
      this.flutterVel = 2.4;
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
      // Keep flutter alive while dragging.
      this.flutter = Math.min(1, this.flutter + Math.hypot(dx, dy) * 0.01);
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

    // Flutter envelope springs toward 0 (~1s settle with stiffness/damping).
    const flutterAccel =
      (0 - this.flutter) * this.spring.stiffness -
      this.flutterVel * this.spring.damping;
    this.flutterVel += flutterAccel * dt;
    this.flutter = Math.max(0, this.flutter + this.flutterVel * dt);
    if (this.flutter < 0.002 && Math.abs(this.flutterVel) < 0.01) {
      this.flutter = 0;
      this.flutterVel = 0;
    }

    this.root.rotation.x = this.targetRot.x;
    this.root.rotation.y = this.targetRot.y;

    // Layer-diff breath + grab page-flutter across yaw/pitch/z.
    const fan = 0.5 + 0.5 * Math.sin(this.autoAngle * 0.9);
    const t = this.autoAngle;
    this.pageLayers.forEach((layer, index) => {
      const base = this.pageBases[index];
      const spread = (index - 1.5) * 0.03 * fan;
      const flutterWave = Math.sin(t * 14 + index * 1.7) * this.flutter;
      const flutterWave2 = Math.cos(t * 11 + index * 1.1) * this.flutter;
      layer.position.x = base.x + spread + flutterWave * 0.035;
      layer.position.y = base.y + flutterWave2 * 0.02;
      layer.position.z = base.z + flutterWave * 0.05;
      layer.rotation.x = base.rotX + flutterWave2 * 0.08;
      layer.rotation.y = base.rotY + flutterWave * 0.07;
      layer.rotation.z = base.rotZ + spread * 0.25 + flutterWave * 0.04;
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
