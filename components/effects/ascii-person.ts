import * as THREE from "three";

/**
 * Big 3D ASCII person — a humanoid built from Braille characters.
 * Each chapter gets a different pose: typing, reading, building, waving, etc.
 * Rendered as THREE.Points with a custom shader that draws Braille glyphs.
 */

export type PersonPose =
  | "typing"    // Hero: sitting at computer, typing
  | "welcome"   // About: standing, arms open
  | "reading"   // Publications: holding/reading a paper
  | "working"   // Experience: hammering/building
  | "building"  // Projects: assembling, arms forward
  | "juggling"  // Skills: dynamic, arms out
  | "waving";   // Contact: one arm up waving

interface Joint {
  name: string;
  position: THREE.Vector3; // Base position
  rotation: THREE.Euler;  // Pose rotation
  length: number;         // Limb length
  radius: number;         // Limb thickness
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
  });

  // Head
  const headY = pelvisY + PERSON_HEIGHT * 0.28 + 0.35;
  joints.push({
    name: "head",
    position: new THREE.Vector3(0, headY, 0),
    rotation: new THREE.Euler(0, 0, 0),
    length: 0, // Sphere, not capsule
    radius: 0.38,
  });

  // Arms — pose-dependent
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
      // Arms open wide
      leftArmRot = new THREE.Euler(0, 0, deg(65));
      rightArmRot = new THREE.Euler(0, 0, deg(-65));
      leftForearmRot = new THREE.Euler(0, 0, deg(15));
      rightForearmRot = new THREE.Euler(0, 0, deg(-15));
      break;
    case "reading":
      // Arms up holding a paper
      leftArmRot = new THREE.Euler(deg(-70), 0, deg(25));
      rightArmRot = new THREE.Euler(deg(-70), 0, deg(-25));
      leftForearmRot = new THREE.Euler(deg(-40), 0, deg(-15));
      rightForearmRot = new THREE.Euler(deg(-40), 0, deg(15));
      break;
    case "working":
      // Right arm raised as if hammering, left steady
      leftArmRot = new THREE.Euler(deg(-30), 0, deg(15));
      rightArmRot = new THREE.Euler(deg(-120), 0, deg(-20));
      leftForearmRot = new THREE.Euler(deg(-20), 0, 0);
      rightForearmRot = new THREE.Euler(deg(-50), 0, 0);
      break;
    case "building":
      // Both arms forward as if assembling
      leftArmRot = new THREE.Euler(deg(-80), 0, deg(10));
      rightArmRot = new THREE.Euler(deg(-80), 0, deg(-10));
      leftForearmRot = new THREE.Euler(deg(-15), 0, 0);
      rightForearmRot = new THREE.Euler(deg(-15), 0, 0);
      break;
    case "juggling":
      // Dynamic, arms out to sides, slightly up
      leftArmRot = new THREE.Euler(deg(-20), 0, deg(75));
      rightArmRot = new THREE.Euler(deg(-20), 0, deg(-75));
      leftForearmRot = new THREE.Euler(deg(-30), 0, deg(20));
      rightForearmRot = new THREE.Euler(deg(-30), 0, deg(-20));
      break;
    case "waving":
      // Right arm up waving, left relaxed
      leftArmRot = new THREE.Euler(deg(-10), 0, deg(12));
      rightArmRot = new THREE.Euler(deg(-160), 0, deg(-15));
      leftForearmRot = new THREE.Euler(deg(-15), 0, 0);
      rightForearmRot = new THREE.Euler(deg(-25), 0, 0);
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
  });

  // Right upper arm
  joints.push({
    name: "r-upper-arm",
    position: new THREE.Vector3(shoulderX, shoulderY, 0),
    rotation: rightArmRot,
    length: upperArmLen,
    radius: 0.14,
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
  });

  // Legs
  const hipY = pelvisY - 0.1;
  const hipX = 0.22;
  const thighLen = PERSON_HEIGHT * 0.24;
  const shinLen = PERSON_HEIGHT * 0.22;

  // Sitting pose for typing: legs bent
  const sitting = pose === "typing";
  const thighRot = sitting
    ? new THREE.Euler(deg(-85), 0, 0)
    : new THREE.Euler(0, 0, deg(4));
  const shinRot = sitting
    ? new THREE.Euler(deg(85), 0, 0)
    : new THREE.Euler(0, 0, deg(-3));

  for (const side of [-1, 1]) {
    const hip = new THREE.Vector3(side * hipX, hipY, 0);
    joints.push({
      name: side < 0 ? "l-thigh" : "r-thigh",
      position: hip,
      rotation: thighRot.clone(),
      length: thighLen,
      radius: 0.17,
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
    });
  }

  return joints;
}

/**
 * Sample points on the surface of capsules (limbs) and spheres (head, joints).
 * Returns positions and normals for ASCII rendering.
 */
function samplePersonPoints(
  joints: Joint[],
  pointsPerUnit = 180,
): { positions: Float32Array; normals: Float32Array; count: number } {
  const positions: number[] = [];
  const normals: number[] = [];

  const up = new THREE.Vector3(0, 1, 0);

  for (const joint of joints) {
    if (joint.name === "head") {
      // Sphere
      const count = Math.floor(pointsPerUnit * 2.5);
      for (let i = 0; i < count; i++) {
        // Fibonacci sphere
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
      }
    } else {
      // Capsule: cylinder + sphere caps
      const dir = new THREE.Vector3(0, -1, 0).applyEuler(joint.rotation).normalize();
      const count = Math.floor(joint.length * pointsPerUnit);

      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const center = joint.position.clone().addScaledVector(dir, t * joint.length);
        // Random angle around the capsule
        const angle = (i * 2.39996) % (Math.PI * 2); // Golden angle
        // Build orthonormal basis
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
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    count: positions.length / 3,
  };
}

const personVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    // 'normal' and 'position' are auto-declared by Three.js — do not redeclare.
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    vec4 projected = projectionMatrix * mv;
    gl_Position = projected;
    // Smaller points so the humanoid shape reads, not a blob.
    gl_PointSize = 90.0 / -mv.z;
  }
`;

const personFragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    // Circular point sprite
    vec2 pc = gl_PointCoord - 0.5;
    float dist = length(pc);
    if (dist > 0.5) discard;

    // Lighting: simple lambert + rim
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vViewDir);
    float diff = max(dot(n, normalize(vec3(0.5, 0.8, 0.6))), 0.0);
    float rim = pow(1.0 - abs(dot(n, v)), 2.0);

    vec3 col = mix(uColorA, uColorB, diff * 0.6 + rim * 0.4);
    col *= 0.5 + 0.4 * diff; // Dimmer — shape over glow.

    // Soft edge
    float alpha = smoothstep(0.5, 0.35, dist);
    gl_FragColor = vec4(col, alpha * 0.85);
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
  const { positions, normals, count } = samplePersonPoints(joints);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));

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
  // Subtle breathing
  person.position.y = Math.sin(time * 1.2) * 0.05;
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
