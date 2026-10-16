import * as THREE from "three";

/**
 * Big 3D ASCII person — a humanoid built from point sprites.
 * Each chapter gets a different pose: typing, reading, building, waving, etc.
 * Body parts get distinct colors (head warm, torso cyan, limbs teal, legs dim)
 * so the silhouette reads as humanoid instead of a blob. Poses come with
 * props: desk+monitor for typing, paper for reading, hammer for working,
 * juggling balls for skills.
 */

export type PersonPose =
  | "typing"    // Hero: sitting at computer, typing
  | "welcome"   // About: standing, arms open
  | "reading"   // Publications: holding/reading a paper
  | "working"   // Experience: hammering/building
  | "building"  // Projects: assembling, arms forward
  | "juggling"  // Skills: dynamic, arms out
  | "waving";   // Contact: one arm up waving

/** Body-part ids for per-part coloring. */
const PART_HEAD = 0;
const PART_TORSO = 1;
const PART_ARM = 2;
const PART_LEG = 3;
const PART_PROP = 4;

interface Joint {
  name: string;
  position: THREE.Vector3; // Base position
  rotation: THREE.Euler;  // Pose rotation
  length: number;         // Limb length
  radius: number;         // Limb thickness
  part: number;           // Body-part id
}

interface Prop {
  kind: "box" | "sphere";
  center: THREE.Vector3;
  size: THREE.Vector3; // box: full extents; sphere: radius in x
  rotation: THREE.Euler;
  count: number;        // point budget
}

// Humanoid proportions (big! ~4 units tall)
const PERSON_HEIGHT = 4.2;

function buildSkeleton(pose: PersonPose): Joint[] {
  const joints: Joint[] = [];
  const deg = THREE.MathUtils.degToRad;

  // Pelvis (root)
  const pelvisY = PERSON_HEIGHT * 0.52;

  // Torso: pelvis to chest
  joints.push({
    name: "torso",
    position: new THREE.Vector3(0, pelvisY, 0),
    rotation: new THREE.Euler(0, 0, 0),
    length: PERSON_HEIGHT * 0.28,
    radius: 0.32,
    part: PART_TORSO,
  });

  // Head
  const headY = pelvisY + PERSON_HEIGHT * 0.28 + 0.35;
  joints.push({
    name: "head",
    position: new THREE.Vector3(0, headY, 0),
    rotation: new THREE.Euler(0, 0, 0),
    length: 0, // Sphere, not capsule
    radius: 0.38,
    part: PART_HEAD,
  });

  // Arms — pose-dependent (exaggerated gestures so poses read at a glance)
  const shoulderY = pelvisY + PERSON_HEIGHT * 0.24;
  const shoulderX = 0.42;

  let leftArmRot: THREE.Euler;
  let rightArmRot: THREE.Euler;
  let leftForearmRot: THREE.Euler;
  let rightForearmRot: THREE.Euler;

  switch (pose) {
    case "typing":
      // Arms forward, bent at elbows as if typing
      leftArmRot = new THREE.Euler(deg(-55), 0, deg(12));
      rightArmRot = new THREE.Euler(deg(-55), 0, deg(-12));
      leftForearmRot = new THREE.Euler(deg(-35), 0, 0);
      rightForearmRot = new THREE.Euler(deg(-35), 0, 0);
      break;
    case "welcome":
      // Arms flung wide open
      leftArmRot = new THREE.Euler(deg(-8), 0, deg(80));
      rightArmRot = new THREE.Euler(deg(-8), 0, deg(-80));
      leftForearmRot = new THREE.Euler(0, 0, deg(22));
      rightForearmRot = new THREE.Euler(0, 0, deg(-22));
      break;
    case "reading":
      // Arms up holding a paper in front of face
      leftArmRot = new THREE.Euler(deg(-70), 0, deg(25));
      rightArmRot = new THREE.Euler(deg(-70), 0, deg(-25));
      leftForearmRot = new THREE.Euler(deg(-45), 0, deg(-18));
      rightForearmRot = new THREE.Euler(deg(-45), 0, deg(18));
      break;
    case "working":
      // Right arm cocked high mid hammer-swing, left braced forward
      leftArmRot = new THREE.Euler(deg(-45), 0, deg(18));
      rightArmRot = new THREE.Euler(deg(-135), 0, deg(-18));
      leftForearmRot = new THREE.Euler(deg(-25), 0, 0);
      rightForearmRot = new THREE.Euler(deg(-45), 0, 0);
      break;
    case "building":
      // Both arms straight forward as if assembling something
      leftArmRot = new THREE.Euler(deg(-85), 0, deg(8));
      rightArmRot = new THREE.Euler(deg(-85), 0, deg(-8));
      leftForearmRot = new THREE.Euler(deg(-10), 0, 0);
      rightForearmRot = new THREE.Euler(deg(-10), 0, 0);
      break;
    case "juggling":
      // Arms up-out in a V, tossing balls
      leftArmRot = new THREE.Euler(deg(-25), 0, deg(80));
      rightArmRot = new THREE.Euler(deg(-25), 0, deg(-80));
      leftForearmRot = new THREE.Euler(deg(-25), 0, deg(25));
      rightForearmRot = new THREE.Euler(deg(-25), 0, deg(-25));
      break;
    case "waving":
      // Right arm straight up waving, left relaxed at side
      leftArmRot = new THREE.Euler(deg(-10), 0, deg(12));
      rightArmRot = new THREE.Euler(deg(-170), 0, deg(-12));
      leftForearmRot = new THREE.Euler(deg(-15), 0, 0);
      rightForearmRot = new THREE.Euler(deg(-15), 0, 0);
      break;
  }

  const upperArmLen = PERSON_HEIGHT * 0.16;
  const forearmLen = PERSON_HEIGHT * 0.15;

  // Left upper arm
  joints.push({
    name: "l-upper-arm",
    position: new THREE.Vector3(-shoulderX, shoulderY, 0),
    rotation: leftArmRot,
    length: upperArmLen,
    radius: 0.14,
    part: PART_ARM,
  });
  // Left forearm (position computed from upper arm end)
  const lElbow = new THREE.Vector3(-shoulderX, shoulderY, 0).add(
    new THREE.Vector3(0, -upperArmLen, 0).applyEuler(leftArmRot),
  );
  joints.push({
    name: "l-forearm",
    position: lElbow,
    rotation: leftForearmRot,
    length: forearmLen,
    radius: 0.11,
    part: PART_ARM,
  });

  // Right upper arm
  joints.push({
    name: "r-upper-arm",
    position: new THREE.Vector3(shoulderX, shoulderY, 0),
    rotation: rightArmRot,
    length: upperArmLen,
    radius: 0.14,
    part: PART_ARM,
  });
  const rElbow = new THREE.Vector3(shoulderX, shoulderY, 0).add(
    new THREE.Vector3(0, -upperArmLen, 0).applyEuler(rightArmRot),
  );
  joints.push({
    name: "r-forearm",
    position: rElbow,
    rotation: rightForearmRot,
    length: forearmLen,
    radius: 0.11,
    part: PART_ARM,
  });

  // Legs
  const hipY = pelvisY - 0.1;
  const hipX = 0.22;
  const thighLen = PERSON_HEIGHT * 0.24;
  const shinLen = PERSON_HEIGHT * 0.22;

  // Sitting pose for typing: thighs forward, shins drop to the floor
  const sitting = pose === "typing";
  const thighRot = sitting
    ? new THREE.Euler(deg(-85), 0, 0)
    : new THREE.Euler(0, 0, deg(4));
  const shinRot = sitting
    ? new THREE.Euler(deg(8), 0, 0)
    : new THREE.Euler(0, 0, deg(-3));

  for (const side of [-1, 1]) {
    const hip = new THREE.Vector3(side * hipX, hipY, 0);
    joints.push({
      name: side < 0 ? "l-thigh" : "r-thigh",
      position: hip,
      rotation: thighRot.clone(),
      length: thighLen,
      radius: 0.17,
      part: PART_LEG,
    });
    const knee = hip.clone().add(
      new THREE.Vector3(0, -thighLen, 0).applyEuler(thighRot),
    );
    joints.push({
      name: side < 0 ? "l-shin" : "r-shin",
      position: knee,
      rotation: shinRot.clone(),
      length: shinLen,
      radius: 0.13,
      part: PART_LEG,
    });
  }

  // Sitting: drop the whole figure so the butt lands on the chair (~1.0)
  if (sitting) {
    for (const j of joints) j.position.y -= 1.0;
  }

  return joints;
}

/** Props per pose — sampled as point clouds with PART_PROP coloring. */
function buildProps(pose: PersonPose): Prop[] {
  const deg = THREE.MathUtils.degToRad;
  const props: Prop[] = [];
  const none = new THREE.Euler(0, 0, 0);

  if (pose === "typing") {
    // Chair: seat + post (butt sits at y≈1.08 after the -1.0 shift)
    props.push({
      kind: "box",
      center: new THREE.Vector3(0, 1.0, -0.15),
      size: new THREE.Vector3(0.55, 0.09, 0.55),
      rotation: none,
      count: 220,
    });
    props.push({
      kind: "box",
      center: new THREE.Vector3(0, 0.5, -0.15),
      size: new THREE.Vector3(0.09, 1.0, 0.09),
      rotation: none,
      count: 120,
    });
    // Desk top (hands hover just above it at y≈1.80, z≈1.18)
    props.push({
      kind: "box",
      center: new THREE.Vector3(0, 1.68, 1.35),
      size: new THREE.Vector3(2.3, 0.08, 1.1),
      rotation: none,
      count: 420,
    });
    // Desk legs
    for (const sx of [-1, 1]) {
      props.push({
        kind: "box",
        center: new THREE.Vector3(sx * 1.05, 0.84, 1.35),
        size: new THREE.Vector3(0.08, 1.68, 0.08),
        rotation: none,
        count: 90,
      });
    }
    // Monitor: screen facing the person (-z), on the desk
    props.push({
      kind: "box",
      center: new THREE.Vector3(0, 2.3, 1.78),
      size: new THREE.Vector3(1.15, 0.72, 0.07),
      rotation: new THREE.Euler(deg(-6), 0, 0),
      count: 380,
    });
    // Monitor stand
    props.push({
      kind: "box",
      center: new THREE.Vector3(0, 1.9, 1.78),
      size: new THREE.Vector3(0.08, 0.4, 0.08),
      rotation: none,
      count: 60,
    });
    // Keyboard slab
    props.push({
      kind: "box",
      center: new THREE.Vector3(0, 1.74, 1.15),
      size: new THREE.Vector3(0.85, 0.04, 0.3),
      rotation: none,
      count: 130,
    });
  }

  if (pose === "reading") {
    // Paper held between the hands, in front of the face
    props.push({
      kind: "box",
      center: new THREE.Vector3(0, 3.35, 1.0),
      size: new THREE.Vector3(0.72, 0.52, 0.03),
      rotation: new THREE.Euler(deg(-12), 0, 0),
      count: 320,
    });
  }

  if (pose === "working") {
    // Hammer gripped in the raised right hand (~(0.42, 4.2, 0.7))
    props.push({
      kind: "box",
      center: new THREE.Vector3(0.42, 4.35, 0.72),
      size: new THREE.Vector3(0.07, 0.55, 0.07),
      rotation: new THREE.Euler(deg(-15), 0, deg(-8)),
      count: 110,
    });
    props.push({
      kind: "box",
      center: new THREE.Vector3(0.42, 4.66, 0.76),
      size: new THREE.Vector3(0.3, 0.13, 0.13),
      rotation: new THREE.Euler(0, 0, deg(-8)),
      count: 90,
    });
  }

  if (pose === "juggling") {
    // Three balls arcing above the hands
    const balls: Array<[number, number, number]> = [
      [-1.25, 3.95, 0.3],
      [1.25, 4.15, 0.3],
      [0.1, 4.45, 0.35],
    ];
    for (const [x, y, z] of balls) {
      props.push({
        kind: "sphere",
        center: new THREE.Vector3(x, y, z),
        size: new THREE.Vector3(0.13, 0, 0),
        rotation: none,
        count: 130,
      });
    }
  }

  return props;
}

/** Deterministic pseudo-random from an integer seed. */
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Sample points on box faces, area-weighted. */
function sampleBoxPoints(
  prop: Prop,
  positions: number[],
  normals: number[],
  parts: number[],
) {
  const [sx, sy, sz] = [prop.size.x, prop.size.y, prop.size.z];
  const areas = [sy * sz, sy * sz, sx * sz, sx * sz, sx * sy, sx * sy];
  const total = areas.reduce((a, b) => a + b, 0);
  // Face basis: [normal, u, v]
  const faces: Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3, number, number]> = [
    [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), sy, sz],
    [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), sy, sz],
    [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), sx, sz],
    [new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), sx, sz],
    [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), sx, sy],
    [new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), sx, sy],
  ];
  let seed = prop.count * 7 + 1;
  for (let f = 0; f < 6; f++) {
    const [n, u, v, du, dv] = faces[f];
    const faceCount = Math.max(4, Math.round((prop.count * areas[f]) / total));
    for (let i = 0; i < faceCount; i++) {
      seed++;
      const a = (hash01(seed) - 0.5) * du;
      const b = (hash01(seed + 0.5) - 0.5) * dv;
      const half = new THREE.Vector3(sx / 2, sy / 2, sz / 2);
      const local = new THREE.Vector3()
        .addScaledVector(n, 0)
        .addScaledVector(u, a)
        .addScaledVector(v, b);
      // Push out to the face plane along the normal
      local.addScaledVector(n, n.x !== 0 ? half.x : n.y !== 0 ? half.y : half.z);
      const world = local.applyEuler(prop.rotation).add(prop.center);
      const worldN = n.clone().applyEuler(prop.rotation);
      positions.push(world.x, world.y, world.z);
      normals.push(worldN.x, worldN.y, worldN.z);
      parts.push(PART_PROP);
    }
  }
}

/** Sample points on a small sphere (juggling balls). */
function sampleSpherePoints(
  prop: Prop,
  positions: number[],
  normals: number[],
  parts: number[],
) {
  const r = prop.size.x;
  const count = prop.count;
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    );
    const pos = prop.center.clone().addScaledVector(dir, r);
    positions.push(pos.x, pos.y, pos.z);
    normals.push(dir.x, dir.y, dir.z);
    parts.push(PART_PROP);
  }
}

/**
 * Sample points on capsules (limbs), spheres (head), and prop boxes/spheres.
 * Returns positions, normals, and per-point body-part ids for coloring.
 */
function sampleFigurePoints(
  joints: Joint[],
  props: Prop[],
  pointsPerUnit = 150,
): { positions: Float32Array; normals: Float32Array; parts: Float32Array; count: number } {
  const positions: number[] = [];
  const normals: number[] = [];
  const parts: number[] = [];

  const up = new THREE.Vector3(0, 1, 0);

  for (const joint of joints) {
    if (joint.name === "head") {
      // Sphere — Fibonacci distribution
      const count = Math.floor(pointsPerUnit * 2.2);
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const dir = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        );
        const pos = joint.position.clone().addScaledVector(dir, joint.radius);
        positions.push(pos.x, pos.y, pos.z);
        normals.push(dir.x, dir.y, dir.z);
        parts.push(joint.part);
      }
    } else {
      // Capsule shaft
      const dir = new THREE.Vector3(0, -1, 0).applyEuler(joint.rotation).normalize();
      const count = Math.floor(joint.length * pointsPerUnit);

      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const center = joint.position.clone().addScaledVector(dir, t * joint.length);
        const angle = (i * 2.39996) % (Math.PI * 2); // Golden angle
        const perp1 = new THREE.Vector3().crossVectors(dir, up).normalize();
        if (perp1.lengthSq() < 0.01) perp1.set(1, 0, 0);
        const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();
        const normal = perp1
          .clone()
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(perp2, Math.sin(angle));
        const pos = center.clone().addScaledVector(normal, joint.radius);
        positions.push(pos.x, pos.y, pos.z);
        normals.push(normal.x, normal.y, normal.z);
        parts.push(joint.part);
      }
    }
  }

  for (const prop of props) {
    if (prop.kind === "box") sampleBoxPoints(prop, positions, normals, parts);
    else sampleSpherePoints(prop, positions, normals, parts);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    parts: new Float32Array(parts),
    count: positions.length / 3,
  };
}

const personVertexShader = /* glsl */ `
  attribute float aPart;
  varying float vPart;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    // 'normal' and 'position' are auto-declared by Three.js — do not redeclare.
    vPart = aPart;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
    // Small points so the silhouette reads instead of blooming into a blob.
    gl_PointSize = 55.0 / -mv.z;
  }
`;

const personFragmentShader = /* glsl */ `
  uniform vec3 uColorA; // cool base (cyan)
  uniform vec3 uColorB; // warm accent (amber)
  uniform float uTime;
  varying float vPart;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    // Circular point sprite
    vec2 pc = gl_PointCoord - 0.5;
    float dist = length(pc);
    if (dist > 0.5) discard;

    // Per-part base color: warm head, cyan torso, teal arms,
    // dimmer legs, warm props. This is what makes it read as humanoid.
    vec3 baseColor;
    if (vPart < 0.5) {
      baseColor = uColorB;                    // head — warm, pops
    } else if (vPart < 1.5) {
      baseColor = uColorA;                    // torso — cyan
    } else if (vPart < 2.5) {
      baseColor = mix(uColorA, uColorB, 0.30); // arms — teal
    } else if (vPart < 3.5) {
      baseColor = uColorA * 0.62;             // legs — dimmer cyan
    } else {
      baseColor = uColorB * 1.05;             // props — warm, distinct object
    }

    // Lighting: lambert + rim, kept dim so additive blending doesn't blow out
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vViewDir);
    float diff = max(dot(n, normalize(vec3(0.5, 0.8, 0.6))), 0.0);
    float rim = pow(1.0 - abs(dot(n, v)), 2.0);

    vec3 col = baseColor * (0.38 + 0.34 * diff) + baseColor * rim * 0.22;

    // Soft edge
    float alpha = smoothstep(0.5, 0.32, dist);
    gl_FragColor = vec4(col, alpha * 0.72);
  }
`;

export interface AsciiPersonOptions {
  pose: PersonPose;
  colorA?: THREE.Color;
  colorB?: THREE.Color;
}

export function createAsciiPerson(options: AsciiPersonOptions): THREE.Points {
  const {
    pose,
    colorA = new THREE.Color(0.3, 0.95, 0.95),
    colorB = new THREE.Color(1.0, 0.75, 0.3),
  } = options;

  const joints = buildSkeleton(pose);
  const props = buildProps(pose);
  const { positions, normals, parts, count } = sampleFigurePoints(joints, props);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("aPart", new THREE.BufferAttribute(parts, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorA: { value: colorA.clone() },
      uColorB: { value: colorB.clone() },
      uTime: { value: 0 },
    },
    vertexShader: personVertexShader,
    fragmentShader: personFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.userData.pose = pose;
  points.userData.pointCount = count;

  return points;
}

export function updateAsciiPerson(person: THREE.Points, time: number) {
  const mat = person.material as THREE.ShaderMaterial;
  mat.uniforms.uTime.value = time;
}

/** Map chapter progress to pose. */
export function poseForProgress(progress: number): PersonPose {
  if (progress < 0.14) return "typing";    // Hero: at computer
  if (progress < 0.28) return "welcome";   // About: arms open
  if (progress < 0.42) return "reading";   // Publications: reading
  if (progress < 0.56) return "working";   // Experience: hammering
  if (progress < 0.70) return "building";  // Projects: assembling
  if (progress < 0.84) return "juggling";  // Skills: dynamic
  return "waving";                          // Contact: waving
}
