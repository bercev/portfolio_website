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
  /**
   * Light clear colors cannot use additive particle blending — mid/dark glyph
   * colors add almost nothing on #eef5fb, so BERAT/CONNECT vanish. Normal
   * blending keeps ink readable; bloom stays dark-only for the same reason.
   */
  readonly lightTheme?: boolean;
  readonly onProgress?: (t: number) => void;
};

/** Draw a word as a particle cloud shaped by a canvas-rendered glyph mask. */
function buildTextPoints(
  text: string,
  count: number,
  palette: JourneyPalette,
  worldH = 7,
  blending: THREE.Blending = THREE.AdditiveBlending,
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
    blending,
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

/**
 * One signature wireframe object per journey chapter, each nodding to the
 * section it backs (in station order):
 *   0 About      — rising spiral: where the path starts
 *   1 Publications — fanned stack of papers
 *   2 Experience — ascending career steps
 *   3 Projects   — git branch graph (Vitae version control)
 *   4 Skills     — atom: interconnected domains
 *   5 Contact    — interlocked rings: connection
 */
const STATION_BUILDERS: ((color: THREE.Color) => THREE.Object3D)[] = [
  buildOriginSpiral,
  buildPaperStack,
  buildCareerSteps,
  buildGitGraph,
  buildSkillAtom,
  buildLinkedRings,
];

/**
 * GLSL port of the vgpu wgsl-std simplex + fbm noise (Ashima 2D simplex),
 * used by the nebula backdrop shader.
 */
const GLSL_NOISE_2D = /* glsl */ `
  vec3 mod289(vec3 x) { return mod(x, 289.0); }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * snoise(p);
      p = p * 2.03 + vec2(11.3, 7.7);
      a *= 0.5;
    }
    return v;
  }
`;

/** Blending for station materials — set per theme before buildStations runs. */
let stationBlending: THREE.Blending = THREE.AdditiveBlending;

/** Sculpture wireframe: breathing pulse + vertical two-tone gradient. */
function stationMaterial(color: THREE.Color): THREE.ShaderMaterial {
  const glow = color.clone().lerp(new THREE.Color(0xffffff), 0.45);
  return new THREE.ShaderMaterial({
    wireframe: true,
    transparent: true,
    depthWrite: false,
    blending: stationBlending,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: Math.random() * Math.PI * 2 },
      uOpacity: { value: 0.62 },
      uColorA: { value: color.clone() },
      uColorB: { value: glow },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uTime;
      uniform float uSeed;
      uniform float uOpacity;
      varying vec3 vPos;
      void main() {
        float pulse = 0.72 + 0.28 * sin(uTime * 1.3 + uSeed);
        vec3 col = mix(uColorA, uColorB, smoothstep(-2.2, 2.2, vPos.y));
        gl_FragColor = vec4(col, uOpacity * pulse);
      }
    `,
  });
}

/** Soft fresnel shell over each sculpture mesh — volumetric edge glow. */
function auraMaterial(color: THREE.Color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: stationBlending,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: Math.random() * Math.PI * 2 },
      uOpacity: {
        value: stationBlending === THREE.AdditiveBlending ? 0.5 : 0.3,
      },
      uColor: { value: color.clone() },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uSeed;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.5);
        float pulse = 0.7 + 0.3 * sin(uTime * 1.1 + uSeed);
        gl_FragColor = vec4(uColor, fresnel * uOpacity * pulse);
      }
    `,
  });
}

/** About — a rising helix the journey lifts off from. */
function buildOriginSpiral(color: THREE.Color): THREE.Object3D {
  const points: THREE.Vector3[] = [];
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * Math.PI * 2 * 3;
    const radius = 0.5 + t * 2.1;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        -1.8 + t * 3.6,
        Math.sin(angle) * radius,
      ),
    );
  }
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        120,
        0.07,
        6,
        false,
      ),
      stationMaterial(color),
    ),
  );
  return group;
}

/** Publications — a fanned stack of papers. */
function buildPaperStack(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  const sheets = 5;
  for (let i = 0; i < sheets; i++) {
    const sheet = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.05, 3.5),
      stationMaterial(color),
    );
    sheet.position.y = (i - (sheets - 1) / 2) * 0.42;
    sheet.rotation.y = (i % 2 ? 1 : -1) * (0.08 + i * 0.05);
    group.add(sheet);
  }
  group.rotation.x = 0.35;
  return group;
}

/** Experience — ascending career steps. */
function buildCareerSteps(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.22, 0.9),
      stationMaterial(color),
    );
    step.position.set(0, -1.6 + i * 0.8, 1.4 - i * 0.7);
    group.add(step);
  }
  return group;
}

/** Projects — a git branch graph: mainline plus a merged feature branch. */
function buildGitGraph(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  const nodeGeo = new THREE.SphereGeometry(0.3, 10, 10);
  const linkGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 6);

  const addNode = (p: THREE.Vector3) => {
    const node = new THREE.Mesh(nodeGeo, stationMaterial(color));
    node.position.copy(p);
    group.add(node);
  };
  const addLink = (from: THREE.Vector3, to: THREE.Vector3) => {
    const dir = to.clone().sub(from);
    const link = new THREE.Mesh(linkGeo, stationMaterial(color));
    link.position.copy(from).addScaledVector(dir, 0.5);
    link.scale.y = dir.length();
    link.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    group.add(link);
  };

  const mainline = [
    new THREE.Vector3(-1.7, -1.7, 0),
    new THREE.Vector3(-1.7, -0.4, 0),
    new THREE.Vector3(-1.7, 0.9, 0),
    new THREE.Vector3(0, 1.8, 0),
  ];
  const branchStart = new THREE.Vector3(1.5, -1.1, 0.5);
  const branchMid = new THREE.Vector3(1.5, 0.5, 0.5);

  mainline.forEach(addNode);
  addNode(branchStart);
  addNode(branchMid);

  addLink(mainline[0], mainline[1]);
  addLink(mainline[1], mainline[2]);
  addLink(mainline[2], mainline[3]);
  addLink(mainline[1], branchStart);
  addLink(branchStart, branchMid);
  addLink(branchMid, mainline[3]);

  group.rotation.z = -0.25;
  return group;
}

/** Skills — an atom: a core with three crossed orbit rings. */
function buildSkillAtom(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.65, 0),
      stationMaterial(color),
    ),
  );
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.06, 6, 48),
      stationMaterial(color),
    );
    ring.rotation.set((i * Math.PI) / 3, (i * Math.PI) / 2.4, 0);
    group.add(ring);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      stationMaterial(color),
    );
    const angle = i * 2.1;
    moon.position
      .set(Math.cos(angle) * 1.9, Math.sin(angle) * 1.9, 0)
      .applyEuler(ring.rotation);
    group.add(moon);
  }
  return group;
}

/** Contact — two interlocked rings. */
function buildLinkedRings(color: THREE.Color): THREE.Object3D {
  const group = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(1.5, 0.22, 8, 40);
  const a = new THREE.Mesh(ringGeo, stationMaterial(color));
  const b = new THREE.Mesh(ringGeo, stationMaterial(color));
  a.position.x = -0.85;
  b.position.x = 0.85;
  b.rotation.y = Math.PI / 2;
  group.add(a);
  group.add(b);
  return group;
}

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
  private readonly stations: THREE.Object3D[] = [];
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
  private paused = false;
  /** Mouse-look / pointer parallax — home + contact only. */
  private pointerLookEnabled = false;
  private readonly particleBlending: THREE.Blending;
  /** Every shader material driven by uTime (sculptures, aura, stars, dust, nebula, trail). */
  private readonly animatedMaterials: THREE.ShaderMaterial[] = [];
  private trail: { geometry: THREE.BufferGeometry; positions: Float32Array } | null = null;

  constructor(options: JourneySceneOptions) {
    const { canvas, quality, reducedMotion, spaceBg, fog, palette, stationCounts, onProgress } = options;
    const lightTheme = Boolean(options.lightTheme);
    const particleBlending = lightTheme ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    this.palette = palette;
    this.particleBlending = particleBlending;
    stationBlending = particleBlending;
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

    this.textPoints = buildTextPoints("BERAT", quality === "full" ? 7000 : 4200, palette, 7, particleBlending);
    this.textGroup.add(this.textPoints);
    this.textGroup.position.set(0, 0.4, 0);
    this.scene.add(this.textGroup);

    this.arrivalPoints = buildTextPoints("CONNECT", quality === "full" ? 6000 : 3600, palette, 5, particleBlending);
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
        // Atmosphere only — never a second hero (esp. light mode).
        opacity: lightTheme ? 0.18 : 0.16,
        blending: particleBlending,
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
        blending: particleBlending,
        depthWrite: false,
      }),
    );
    this.scene.add(this.comet);

    if (quality === "full") {
      // Camera must be part of the graph for its children (nebula) to render.
      this.scene.add(this.camera);

      // Domain-warped fbm nebula backdrop (noise ported from vgpu wgsl-std).
      const nebulaMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: lightTheme ? 0.14 : 0.3 },
          uTintA: {
            value: new THREE.Color(palette.accent).lerp(new THREE.Color(fog), 0.55),
          },
          uTintB: {
            value: new THREE.Color(palette.cyan).lerp(new THREE.Color(palette.emerald), 0.5),
          },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader:
          GLSL_NOISE_2D +
          `
          uniform float uTime;
          uniform float uIntensity;
          uniform vec3 uTintA;
          uniform vec3 uTintB;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv * vec2(4.0, 2.4);
            p += vec2(uTime * 0.01, -uTime * 0.006);
            float n = fbm(p + 0.6 * fbm(p * 1.7 + 3.1));
            float d = smoothstep(-0.35, 0.85, n);
            vec3 col = mix(uTintA, uTintB, clamp(n * 0.5 + 0.5, 0.0, 1.0));
            gl_FragColor = vec4(col, d * uIntensity);
          }
        `,
      });
      const nebula = new THREE.Mesh(new THREE.PlaneGeometry(560, 260), nebulaMat);
      nebula.position.set(0, 0, -170);
      nebula.renderOrder = -1;
      nebula.frustumCulled = false;
      this.camera.add(nebula);
      this.animatedMaterials.push(nebulaMat);

      // Fading particle trail behind the comet (ring buffer, newest at index 0).
      const TRAIL_N = 28;
      const trailPos = new Float32Array(TRAIL_N * 3);
      const start = this.curve.getPointAt(0);
      for (let i = 0; i < TRAIL_N; i++) {
        trailPos[i * 3] = start.x;
        trailPos[i * 3 + 1] = start.y;
        trailPos[i * 3 + 2] = start.z;
      }
      const trailAge = new Float32Array(TRAIL_N);
      for (let i = 0; i < TRAIL_N; i++) trailAge[i] = i / (TRAIL_N - 1);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
      trailGeo.setAttribute("aAge", new THREE.BufferAttribute(trailAge, 1));
      const trailMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: particleBlending,
        uniforms: {
          uPixelScale: { value: window.innerHeight * 0.5 },
          uColor: { value: new THREE.Color(palette.accent) },
        },
        vertexShader: `
          attribute float aAge;
          uniform float uPixelScale;
          varying float vAge;
          void main() {
            vAge = aAge;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uPixelScale * mix(0.16, 0.04, aAge) / max(1.0, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vAge;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float alpha = smoothstep(0.5, 0.1, d) * (1.0 - vAge) * 0.85;
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });
      const trailPoints = new THREE.Points(trailGeo, trailMat);
      trailPoints.frustumCulled = false;
      this.scene.add(trailPoints);
      this.trail = { geometry: trailGeo, positions: trailPos };
      this.animatedMaterials.push(trailMat);
    }

    // Bloom + additive glow only reads on dark clears; skip in light theme.
    if (quality === "full" && !lightTheme) {
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
    const { cyan, emerald, coral, accent } = this.palette;
    const stops = [
      new THREE.Color(cyan),
      new THREE.Color(emerald),
      new THREE.Color(coral),
      new THREE.Color(accent),
    ];
    const starPos = new Float32Array(count * 3);
    const starCol = new Float32Array(count * 3);
    const starSeed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 170;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      starPos[i * 3 + 2] = 40 - Math.random() * 210;
      const c = stops[(Math.random() * stops.length) | 0];
      const dim = 0.35 + Math.random() * 0.65;
      starCol[i * 3] = c.r * dim;
      starCol[i * 3 + 1] = c.g * dim;
      starCol[i * 3 + 2] = c.b * dim;
      starSeed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(starCol, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(starSeed, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: this.particleBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelScale: { value: window.innerHeight * 0.5 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelScale;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          vColor = aColor;
          vTw = 0.55 + 0.45 * sin(uTime * (0.5 + fract(aSeed * 3.7) * 1.3) + aSeed * 6.2831);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uPixelScale * (0.22 + 0.3 * fract(aSeed * 7.3)) * vTw / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTw;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.1, d) * vTw;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });
    this.animatedMaterials.push(mat);
    return new THREE.Points(geo, mat);
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
    for (let i = 0; i < STATION_BUILDERS.length; i++) {
      const object = STATION_BUILDERS[i](tintColors[i]);
      const p = this.curve.getPointAt(stationT[i]);
      object.position.set(
        p.x + (i % 2 ? 3.5 : -3.5),
        p.y + (i % 3 - 1) * 1.6,
        p.z - 3,
      );
      this.stations.push(object);
      this.scene.add(object);

      // Wireframe pulse materials + soft fresnel aura shells per mesh.
      // Collect first — adding children mid-traverse would recurse forever.
      const meshes: THREE.Mesh[] = [];
      object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
      });
      for (const mesh of meshes) {
        const mat = mesh.material as THREE.ShaderMaterial;
        if (mat?.uniforms?.uTime) this.animatedMaterials.push(mat);
        const aura = new THREE.Mesh(mesh.geometry, auraMaterial(tintColors[i]));
        aura.scale.setScalar(1.045);
        mesh.add(aura);
        this.animatedMaterials.push(aura.material as THREE.ShaderMaterial);
      }

      const count = Math.min(stationCounts[i] ?? 0, 60);
      if (count > 0) {
        this.orbitDust.push(
          this.buildOrbitDust(object.position, count, tintColors[i], 0.1 + i * 0.05),
        );
      }
    }
  }

  /** Per-particle orbital motion computed in the vertex shader — round soft sprites. */
  private buildOrbitDust(
    center: THREE.Vector3,
    count: number,
    tint: THREE.Color,
    speed: number,
  ): THREE.Points {
    const colors = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    const radii = new Float32Array(count);
    const heights = new Float32Array(count);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      angles[i] = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      radii[i] = 3.2 + Math.random() * 1.4;
      heights[i] = (Math.random() - 0.5) * 2.2;
      const dim = 0.5 + Math.random() * 0.5;
      colors[i * 3] = tint.r * dim;
      colors[i * 3 + 1] = tint.g * dim;
      colors[i * 3 + 2] = tint.b * dim;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aAngle", new THREE.BufferAttribute(angles, 1));
    geo.setAttribute("aRadius", new THREE.BufferAttribute(radii, 1));
    geo.setAttribute("aHeight", new THREE.BufferAttribute(heights, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: this.particleBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelScale: { value: window.innerHeight * 0.5 },
        uCenter: { value: center.clone() },
        uSpeed: { value: speed },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aAngle;
        attribute float aRadius;
        attribute float aHeight;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelScale;
        uniform vec3 uCenter;
        uniform float uSpeed;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          float ang = aAngle + uTime * uSpeed * (0.6 + 0.8 * fract(aSeed * 5.1));
          vec3 p = uCenter + vec3(cos(ang) * aRadius, aHeight, sin(ang) * aRadius * 0.6);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uPixelScale * 0.2 / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.12, d) * 0.9;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });
    this.animatedMaterials.push(mat);
    const points = new THREE.Points(geo, mat);
    // Real positions live in attributes, not `position` — never cull.
    points.frustumCulled = false;
    this.scene.add(points);
    return points;
  }
  private readonly handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.composer?.setSize(window.innerWidth, window.innerHeight);
    const pixelScale = window.innerHeight * 0.5;
    for (const mat of this.animatedMaterials) {
      if (mat.uniforms.uPixelScale) mat.uniforms.uPixelScale.value = pixelScale;
    }
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
      // Orbit dust animates per-particle in its own vertex shader.
      const cometT = ((t / 26) % 1 + 1) % 1;
      this.comet.position.copy(this.curve.getPointAt(cometT));
      this.comet.scale.setScalar(1 + Math.sin(t * 4) * 0.3);
      if (this.trail) {
        const { geometry, positions } = this.trail;
        const n = positions.length / 3;
        for (let i = n - 1; i > 0; i--) {
          positions[i * 3] = positions[(i - 1) * 3];
          positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
          positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
        }
        positions[0] = this.comet.position.x;
        positions[1] = this.comet.position.y;
        positions[2] = this.comet.position.z;
        (geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // Drive every uTime-based material (sculpture pulse, aura, stars, dust, nebula).
    for (const mat of this.animatedMaterials) {
      if (mat.uniforms.uTime) mat.uniforms.uTime.value = t;
    }

    const pos = this.curve.getPointAt(this.journeyT());
    this.camera.position.copy(pos);
    this.curve.getTangentAt(this.journeyT(), this.tangent);
    this.lookTarget.copy(pos).add(this.tangent);
    if (!this.reducedMotion && this.pointerLookEnabled) {
      this.lookTarget.x += this.pointer.x * 1.4;
      this.lookTarget.y += this.pointer.y * 0.9;
    }
    this.camera.lookAt(this.lookTarget);

    this.composer?.render();
    if (!this.composer) this.renderer.render(this.scene, this.camera);
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    if (this.paused) {
      this.raf = 0;
      return;
    }
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

  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      return;
    }
    if (!this.disposed && this.raf === 0) {
      // Refresh the timer so resume does not ingest a huge delta.
      this.timer.update(performance.now());
      this.loop(performance.now());
    }
  }

  /** Enable mouse-moves-camera only on #home and Contact; mid-stations are scroll-driven. */
  setPointerLookEnabled(enabled: boolean) {
    if (this.pointerLookEnabled === enabled) return;
    this.pointerLookEnabled = enabled;
    if (!enabled) {
      this.pointer.x = 0;
      this.pointer.y = 0;
    }
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