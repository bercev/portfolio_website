import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

export type JourneyQuality = "full" | "mobile";

export type JourneyPalette = {
  readonly accent: string;
  readonly cyan: string;
  readonly emerald: string;
  readonly amber: string;
  readonly coral: string;
};

export type JourneySceneOptions = {
  readonly canvas: HTMLCanvasElement;
  readonly quality: JourneyQuality;
  readonly reducedMotion: boolean;
  readonly spaceBg: string;
  readonly fog: string;
  readonly palette: JourneyPalette;
  /** Orbit dust count per station — mirrors portfolio content (papers, roles, projects, skills). */
  readonly stationCounts: readonly number[];
  readonly onProgress?: (t: number) => void;
};

/** Draw a word as a particle cloud shaped by a canvas-rendered glyph mask. */
function buildTextPoints(
  text: string,
  count: number,
  palette: JourneyPalette,
  worldH = 7,
): THREE.Points {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable for journey text");
  const fontPx = 220;
  ctx.font = `800 ${fontPx}px ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif`;
  const m = ctx.measureText(text);
  c.width = Math.ceil(m.width) + 40;
  c.height = fontPx * 1.4;
  ctx.font = `800 ${fontPx}px ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 20, c.height / 2);

  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const candidates: Array<[number, number]> = [];
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      if (data[(y * c.width + x) * 4 + 3] > 128) candidates.push([x, y]);
    }
  }

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const aspect = c.width / c.height;
  const worldW = worldH * aspect;
  const colorStops = [
    new THREE.Color(palette.accent),
    new THREE.Color(palette.cyan),
    new THREE.Color(palette.emerald),
    new THREE.Color(palette.coral),
  ];
  for (let i = 0; i < count; i++) {
    const [px, py] = candidates[(Math.random() * candidates.length) | 0] ?? [
      c.width / 2,
      c.height / 2,
    ];
    positions[i * 3] = (px / c.width - 0.5) * worldW + (Math.random() - 0.5) * 0.06;
    positions[i * 3 + 1] = -(py / c.height - 0.5) * worldH + (Math.random() - 0.5) * 0.06;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
    const col = colorStops[(Math.random() * colorStops.length) | 0];
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    seeds[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScatter: { value: 0 },
    },
    vertexShader: `
      attribute float seed;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vFade;
      uniform float uTime;
      uniform float uScatter;
      void main() {
        vColor = color;
        vec3 p = position;
        vec3 dir = normalize(vec3(sin(seed * 3.1), cos(seed * 2.3), sin(seed * 5.7)));
        p += dir * uScatter * (9.0 + seed * 2.0);
        p.y += sin(uTime * 0.8 + seed) * 0.05;
        p.x += cos(uTime * 0.6 + seed * 1.7) * 0.04;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        gl_PointSize = min((1.1 + 1.3 * fract(seed)) * (60.0 / dist), 7.0);
        vFade = smoothstep(70.0, 18.0, dist) * smoothstep(1.5, 7.0, dist);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float alpha = smoothstep(0.5, 0.05, d) * vFade;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });

  return new THREE.Points(geo, mat);
}

const STATION_SHAPES = [
  () => new THREE.IcosahedronGeometry(2.4, 0),
  () => new THREE.TorusKnotGeometry(1.7, 0.5, 96, 12),
  () => new THREE.OctahedronGeometry(2.2, 0),
  () => new THREE.TorusGeometry(1.9, 0.6, 12, 40),
  () => new THREE.ConeGeometry(1.8, 3.6, 5),
  () => new THREE.DodecahedronGeometry(2.2, 0),
] as const;

export class JourneyScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly quality: JourneyQuality;
  private readonly reducedMotion: boolean;
  private readonly onProgress?: (t: number) => void;
  private readonly palette: JourneyPalette;

  private readonly composer: EffectComposer | null;
  private readonly curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.4, 15),
    new THREE.Vector3(0, 0.4, 7),
    new THREE.Vector3(6, 2, 0),
    new THREE.Vector3(9, -1, -8),
    new THREE.Vector3(3, 3, -18),
    new THREE.Vector3(-6, 1, -24),
    new THREE.Vector3(-10, -2, -34),
    new THREE.Vector3(-2, 2, -44),
    new THREE.Vector3(8, 0, -54),
    new THREE.Vector3(10, -2, -66),
    new THREE.Vector3(0, 1, -78),
    new THREE.Vector3(-8, 0, -90),
    new THREE.Vector3(-4, 2, -102),
    new THREE.Vector3(2, 0, -114),
    new THREE.Vector3(0, 0, -128),
  ]);
  private readonly stations: THREE.Mesh[] = [];
  private readonly orbitDust: THREE.Points[] = [];
  private readonly textGroup = new THREE.Group();
  private readonly arrivalGroup = new THREE.Group();
  private readonly textPoints: THREE.Points;
  private readonly arrivalPoints: THREE.Points;
  private readonly comet: THREE.Mesh;
  private readonly stars: THREE.Points;

  private readonly tangent = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3(0, 0, 0);
  private readonly pointer = { x: 0, y: 0 };
  private readonly timer = new THREE.Timer();
  private targetT = 0;
  private smoothT = 0;
  private raf = 0;
  private disposed = false;

  constructor(options: JourneySceneOptions) {
    const { canvas, quality, reducedMotion, spaceBg, fog, palette, stationCounts, onProgress } = options;
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    this.palette = palette;
    this.onProgress = onProgress;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.setClearColor(new THREE.Color(spaceBg), 1);

    this.scene.fog = new THREE.FogExp2(new THREE.Color(fog), 0.028);
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      220,
    );

    this.textPoints = buildTextPoints("BERAT", quality === "full" ? 7000 : 4200, palette);
    this.textGroup.add(this.textPoints);
    this.textGroup.position.set(0, 0.4, 0);
    this.scene.add(this.textGroup);

    this.arrivalPoints = buildTextPoints("CONNECT", quality === "full" ? 6000 : 3600, palette, 5);
    (this.arrivalPoints.material as THREE.ShaderMaterial).uniforms.uScatter.value = 1;
    this.arrivalGroup.add(this.arrivalPoints);
    this.arrivalGroup.position.set(0, 0.4, -142);
    this.scene.add(this.arrivalGroup);

    this.stars = this.buildStarfield(quality === "full" ? 2600 : 1300);
    this.scene.add(this.stars);

    this.buildStations(stationCounts);

    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, 220, 0.05, 8, false),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.cyan),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.scene.add(tube);

    this.comet = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 12),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.accent),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.scene.add(this.comet);

    if (quality === "full") {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(
        new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.35,
          0.4,
          0.55,
        ),
      );
      this.composer.setSize(window.innerWidth, window.innerHeight);
    } else {
      this.composer = null;
    }

    if (!reducedMotion) {
      this.bindScroll();
      window.addEventListener("resize", this.handleResize);
      window.addEventListener("pointermove", this.handlePointerMove, {
        passive: true,
      });
    }

    this.renderOneFrame(0);
    if (!reducedMotion) this.loop(performance.now());
  }
private buildStarfield(count: number): THREE.Points {
    const { cyan, emerald, coral } = this.palette;
    const stops = [new THREE.Color(cyan), new THREE.Color(emerald), new THREE.Color(coral)];
    const starPos = new Float32Array(count * 3);
    const starCol = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 170;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      starPos[i * 3 + 2] = 40 - Math.random() * 210;
      const c = stops[(Math.random() * stops.length) | 0];
      const dim = 0.35 + Math.random() * 0.65;
      starCol[i * 3] = c.r * dim;
      starCol[i * 3 + 1] = c.g * dim;
      starCol[i * 3 + 2] = c.b * dim;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.32,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
  }

  /** One glowing wireframe station per chapter + orbiting "content dust" mirroring portfolio scale. */
  private buildStations(stationCounts: readonly number[]) {
    const tintColors = [
      new THREE.Color(this.palette.accent),
      new THREE.Color(this.palette.cyan),
      new THREE.Color(this.palette.emerald),
      new THREE.Color(this.palette.amber),
      new THREE.Color(this.palette.coral),
      new THREE.Color(this.palette.accent),
    ];

    const stationT = [0.18, 0.34, 0.5, 0.66, 0.82, 0.95];
    for (let i = 0; i < STATION_SHAPES.length; i++) {
      const mesh = new THREE.Mesh(
        STATION_SHAPES[i](),
        new THREE.MeshBasicMaterial({
          color: tintColors[i],
          wireframe: true,
          transparent: true,
          opacity: 0.55,
        }),
      );
      const p = this.curve.getPointAt(stationT[i]);
      mesh.position.set(
        p.x + (i % 2 ? 3.5 : -3.5),
        p.y + (i % 3 - 1) * 1.6,
        p.z - 3,
      );
      this.stations.push(mesh);
      this.scene.add(mesh);

      const count = Math.min(stationCounts[i] ?? 0, 60);
      if (count > 0) {
        this.orbitDust.push(this.buildOrbitDust(mesh.position, count, tintColors[i]));
      }
    }
  }

  private buildOrbitDust(center: THREE.Vector3, count: number, tint: THREE.Color): THREE.Points {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 3.2 + Math.random() * 1.4;
      positions[i * 3] = center.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = center.y + (Math.random() - 0.5) * 2.2;
      positions[i * 3 + 2] = center.z + Math.sin(angle) * radius * 0.6;
      const dim = 0.5 + Math.random() * 0.5;
      colors[i * 3] = tint.r * dim;
      colors[i * 3 + 1] = tint.g * dim;
      colors[i * 3 + 2] = tint.b * dim;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.22,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    this.scene.add(points);
    return points;
  }
private readonly handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.composer?.setSize(window.innerWidth, window.innerHeight);
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    this.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    this.pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
  };

  private readonly handleScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = Number.isFinite(window.scrollY) ? window.scrollY : 0;
    this.targetT = max > 0 ? y / max : 0;
  };

  private bindScroll() {
    this.handleScroll();
    window.addEventListener("scroll", this.handleScroll, { passive: true });
  }

  /** Damped scroll progress, clamped and NaN-safe for the curve lookup. */
  private journeyT(): number {
    const t = this.reducedMotion ? 0 : this.smoothT;
    return Number.isFinite(t) ? THREE.MathUtils.clamp(t, 0, 1) : 0;
  }

  private renderOneFrame(time: number) {
    // `time` is elapsed seconds.
    const t = Math.max(0, time);
    const scatter = this.reducedMotion ? 0 : THREE.MathUtils.smoothstep(this.smoothT, 0.02, 0.16);
    (this.textPoints.material as THREE.ShaderMaterial).uniforms.uScatter.value = scatter;
    (this.textPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    this.textGroup.rotation.y = Math.sin(t * 0.15) * 0.06;

    const arrive = this.reducedMotion
      ? 1
      : 1 - THREE.MathUtils.smoothstep(this.smoothT, 0.8, 0.95);
    (this.arrivalPoints.material as THREE.ShaderMaterial).uniforms.uScatter.value = arrive;
    (this.arrivalPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    this.arrivalGroup.rotation.y = Math.sin(t * 0.12 + 2) * 0.05;

    if (!this.reducedMotion) {
      this.stars.rotation.y = t * 0.008;
      this.stations.forEach((mesh, i) => {
        mesh.rotation.x = t * (0.12 + i * 0.03);
        mesh.rotation.y = t * (0.16 + i * 0.02);
        mesh.position.y += Math.sin(t * 0.6 + i * 1.7) * 0.002;
      });
      this.orbitDust.forEach((dust, i) => {
        dust.rotation.y = t * (0.1 + i * 0.05);
      });
      const cometT = ((t / 26) % 1 + 1) % 1;
      this.comet.position.copy(this.curve.getPointAt(cometT));
      this.comet.scale.setScalar(1 + Math.sin(t * 4) * 0.3);
    }

    const pos = this.curve.getPointAt(this.journeyT());
    this.camera.position.copy(pos);
    this.curve.getTangentAt(this.journeyT(), this.tangent);
    this.lookTarget.copy(pos).add(this.tangent);
    if (!this.reducedMotion) {
      this.lookTarget.x += this.pointer.x * 1.4;
      this.lookTarget.y += this.pointer.y * 0.9;
    }
    this.camera.lookAt(this.lookTarget);

    this.composer?.render();
    if (!this.composer) this.renderer.render(this.scene, this.camera);
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    this.timer.update(now);
    const rawDt = this.timer.getDelta();
    const dt = Number.isFinite(rawDt) && rawDt > 0 ? Math.min(rawDt, 0.05) : 1 / 60;
    const t = Math.max(0, this.timer.getElapsed());
    this.smoothT += (this.targetT - this.smoothT) * (1 - Math.exp(-3.2 * dt));
    if (!Number.isFinite(this.smoothT)) this.smoothT = this.targetT;
    this.renderOneFrame(t);
    this.onProgress?.(Number.isFinite(this.smoothT) ? this.smoothT : 0);
    this.raf = requestAnimationFrame(this.loop);
  };

  resize() {
    this.handleResize();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("pointermove", this.handlePointerMove);
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