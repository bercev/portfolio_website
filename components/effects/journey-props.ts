import * as THREE from "three";

import type { JourneyPropManifest } from "@/data/journey-props";
import { brandColorForTech, iconForTech } from "@/lib/tech-icons";

export type JourneyPropTheme = {
  readonly lightTheme: boolean;
  readonly inkAlpha: number;
  readonly blending: THREE.Blending;
  readonly palette: readonly THREE.Color[];
};

export type ContentPropHandle = {
  readonly object: THREE.Object3D;
  readonly stationIndex: number;
  readonly pathT: number;
  readonly baseOpacity: number;
  readonly materials: THREE.Material[];
  readonly textures: THREE.Texture[];
  readonly kind: "preview" | "tech" | "role";
};

const MAX_PREVIEW_EDGE = 512;
/** Simple Icons glyphs are authored in a 24×24 viewBox. */
const ICON_VIEW = 24;

/** Presence fade: invisible far from the chapter, readable near it. */
export function propPresence(smoothT: number, pathT: number, width = 0.11) {
  const d = Math.abs(smoothT - pathT);
  if (d >= width) return 0;
  const x = 1 - d / width;
  return x * x * (3 - 2 * x);
}

/** Downscale a remote image into a CanvasTexture capped at maxEdge. */
export async function loadDownscaledTexture(
  url: string,
  maxEdge = MAX_PREVIEW_EDGE,
): Promise<{ texture: THREE.CanvasTexture; aspect: number } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return { texture, aspect: w / h };
  } catch {
    return null;
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function cssFromColor(color: THREE.Color) {
  return `#${color.getHexString()}`;
}

function paintLabelCanvas(
  label: string,
  color: string,
  options: { readonly size?: "role" | "badge"; readonly lightTheme: boolean },
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const size = options.size ?? "role";
  const fontPx = size === "badge" ? 72 : 48;
  const padX = size === "badge" ? 48 : 28;
  const padY = size === "badge" ? 36 : 18;
  ctx.font = `700 ${fontPx}px ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif`;
  const metrics = ctx.measureText(label);
  canvas.width = Math.ceil(metrics.width + padX * 2);
  canvas.height = Math.ceil(fontPx * 1.35 + padY * 2);

  ctx.font = `700 ${fontPx}px ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  if (size === "badge") {
    const r = 18;
    ctx.fillStyle = options.lightTheme ? "rgba(20, 32, 40, 0.12)" : "rgba(8, 14, 22, 0.55)";
    roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, r);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, r);
    ctx.stroke();
  }

  ctx.fillStyle = color;
  ctx.shadowColor = options.lightTheme ? "transparent" : color;
  ctx.shadowBlur = options.lightTheme ? 0 : 18;
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { texture, aspect: canvas.width / canvas.height };
}

/**
 * Bare tech glyph on a transparent canvas — no plate, no caption.
 * Reads like other Journey props: a floating mark in space, not a UI chip.
 */
export function paintTechIconCanvas(
  label: string,
  accent: string,
  lightTheme: boolean,
): { texture: THREE.CanvasTexture; aspect: number } | null {
  const icon = iconForTech(label);
  if (!icon) return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const brand = brandColorForTech(label) ?? accent;
  // Extra padding so soft glow doesn't clip; glyph itself stays square.
  const glyph = 256;
  const pad = lightTheme ? 24 : 48;
  canvas.width = glyph + pad * 2;
  canvas.height = glyph + pad * 2;

  ctx.save();
  if (!lightTheme) {
    ctx.shadowColor = brand;
    ctx.shadowBlur = 36;
  }
  ctx.translate(pad, pad);
  ctx.scale(glyph / ICON_VIEW, glyph / ICON_VIEW);
  ctx.fillStyle = brand;
  ctx.fill(new Path2D(icon.path));
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { texture, aspect: 1 };
}

function labelPlane(
  label: string,
  color: THREE.Color,
  theme: JourneyPropTheme,
  size: "role" | "badge",
  worldH: number,
): { mesh: THREE.Mesh; texture: THREE.CanvasTexture; material: THREE.MeshBasicMaterial } | null {
  const painted = paintLabelCanvas(label, cssFromColor(color), {
    size,
    lightTheme: theme.lightTheme,
  });
  if (!painted) return null;

  const height = worldH;
  const width = height * painted.aspect;
  const material = new THREE.MeshBasicMaterial({
    map: painted.texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    opacity: theme.lightTheme ? 0.92 : 0.96,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.renderOrder = 6;
  return { mesh, texture: painted.texture, material };
}

function techIconPlane(
  label: string,
  accent: THREE.Color,
  theme: JourneyPropTheme,
  worldSize: number,
): { mesh: THREE.Mesh; texture: THREE.CanvasTexture; material: THREE.MeshBasicMaterial } | null {
  const painted = paintTechIconCanvas(label, cssFromColor(accent), theme.lightTheme);
  if (!painted) return null;

  const material = new THREE.MeshBasicMaterial({
    map: painted.texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    // Match Journey particle blending so glyphs glow like other mid-path props.
    blending: theme.lightTheme ? THREE.NormalBlending : theme.blending,
    opacity: theme.lightTheme ? 0.88 * theme.inkAlpha : 0.95,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(worldSize, worldSize),
    material,
  );
  mesh.renderOrder = 6;
  return { mesh, texture: painted.texture, material };
}

function previewFrame(
  texture: THREE.Texture,
  aspect: number,
  accent: THREE.Color,
  theme: JourneyPropTheme,
  worldH: number,
): { group: THREE.Group; materials: THREE.Material[]; textures: THREE.Texture[] } {
  const group = new THREE.Group();
  const width = worldH * aspect;
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: theme.lightTheme ? 0.94 : 0.95,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, worldH), mat);
  plane.position.z = 0.02;
  plane.renderOrder = 6;

  const rim = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.06, worldH * 1.06),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      depthWrite: false,
      opacity: theme.lightTheme ? 0.42 : 0.55,
      side: THREE.DoubleSide,
      blending: theme.blending,
      toneMapped: false,
    }),
  );
  rim.position.z = -0.01;
  rim.renderOrder = 5;

  group.add(rim);
  group.add(plane);
  return {
    group,
    materials: [mat, rim.material as THREE.Material],
    textures: [texture],
  };
}

/**
 * Build content-aware Journey props. Image previews are async; call when fonts/scene ready.
 */
export async function buildJourneyContentProps({
  manifest,
  theme,
  stationPathT,
  includeImages,
}: {
  readonly manifest: JourneyPropManifest;
  readonly theme: JourneyPropTheme;
  readonly stationPathT: readonly number[];
  readonly includeImages: boolean;
}): Promise<ContentPropHandle[]> {
  const handles: ContentPropHandle[] = [];

  // —— Preview / badge cards beside Publications + Projects ——
  const byStation = new Map<number, number>();
  for (const preview of manifest.previews) {
    const slot = byStation.get(preview.stationIndex) ?? 0;
    byStation.set(preview.stationIndex, slot + 1);
    const pathT = stationPathT[preview.stationIndex] ?? 0.5;
    const accent =
      theme.palette[preview.stationIndex % theme.palette.length] ?? theme.palette[0];

    if (preview.kind === "image" && preview.src && includeImages) {
      const loaded = await loadDownscaledTexture(preview.src);
      if (!loaded) continue;
      const framed = previewFrame(
        loaded.texture,
        preview.aspect || loaded.aspect,
        accent,
        theme,
        preview.stationIndex === 1 ? 3.4 : 3.0,
      );
      framed.group.userData.propSlot = slot;
      framed.group.userData.propSide = slot % 2 === 0 ? 1 : -1;
      handles.push({
        object: framed.group,
        stationIndex: preview.stationIndex,
        pathT,
        baseOpacity: theme.lightTheme ? 0.94 : 0.95,
        materials: framed.materials,
        textures: framed.textures,
        kind: "preview",
      });
      continue;
    }

    // Prefer Discord glyph for the chatbot mark when available.
    if (preview.id === "discord-bot") {
      const iconMark = techIconPlane("Discord", accent, theme, 1.45);
      if (iconMark) {
        const group = new THREE.Group();
        group.add(iconMark.mesh);
        group.userData.propSlot = slot;
        group.userData.propSide = slot % 2 === 0 ? 1 : -1;
        handles.push({
          object: group,
          stationIndex: preview.stationIndex,
          pathT,
          baseOpacity: iconMark.material.opacity,
          materials: [iconMark.material],
          textures: [iconMark.texture],
          kind: "preview",
        });
        continue;
      }
    }

    // Badge / fallback when images are skipped (mobile) or missing src.
    const badge = labelPlane(preview.label, accent, theme, "badge", 1.55);
    if (!badge) continue;
    const group = new THREE.Group();
    group.add(badge.mesh);
    group.userData.propSlot = slot;
    group.userData.propSide = slot % 2 === 0 ? 1 : -1;
    handles.push({
      object: group,
      stationIndex: preview.stationIndex,
      pathT,
      baseOpacity: badge.material.opacity,
      materials: [badge.material],
      textures: [badge.texture],
      kind: "preview",
    });
  }

  // —— Floating tech glyphs around Skills ——
  const skillsT = stationPathT[4] ?? 0.77;
  manifest.tech.forEach((tech, i) => {
    const tint = theme.palette[tech.tint % theme.palette.length] ?? theme.palette[0];
    const mark = techIconPlane(tech.label, tint, theme, 1.15);
    if (!mark) return;
    const group = new THREE.Group();
    group.add(mark.mesh);
    group.userData.orbitIndex = i;
    group.userData.orbitCount = manifest.tech.length;
    handles.push({
      object: group,
      stationIndex: 4,
      pathT: skillsT,
      baseOpacity: mark.material.opacity,
      materials: [mark.material],
      textures: [mark.texture],
      kind: "tech",
    });
  });

  // —— Experience role chips ——
  const experienceT = stationPathT[2] ?? 0.49;
  manifest.roles.forEach((role, i) => {
    const tint = theme.palette[(i + 2) % theme.palette.length] ?? theme.palette[0];
    const label = labelPlane(role, tint, theme, "role", 0.78);
    if (!label) return;
    const group = new THREE.Group();
    group.add(label.mesh);
    group.userData.roleIndex = i;
    group.userData.roleCount = manifest.roles.length;
    handles.push({
      object: group,
      stationIndex: 2,
      pathT: experienceT,
      baseOpacity: label.material.opacity,
      materials: [label.material],
      textures: [label.texture],
      kind: "role",
    });
  });

  return handles;
}

export function disposeContentProp(handle: ContentPropHandle) {
  handle.object.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
  });
  for (const material of handle.materials) material.dispose();
  for (const texture of handle.textures) texture.dispose();
}
