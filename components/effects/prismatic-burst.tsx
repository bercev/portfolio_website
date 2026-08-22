"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";
import type { OGLRenderingContext } from "ogl";

import type { EffectProfile } from "@/lib/effect-policy";
import { getPrismaticPalette } from "@/lib/prismatic-palette";

const vertexShader = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

const fragmentShader = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uDistort;
uniform int uRayCount;
uniform int uColorCount;
uniform sampler2D uGradient;
uniform vec3 uBackground;

float hash21(vec2 p) { p = floor(p); return fract(52.9829189 * fract(dot(p, vec2(0.065, 0.005)))); }
mat2 rotate(float angle) { float s = sin(angle), c = cos(angle); return mat2(c, -s, s, c); }
vec3 gradient(float position) { return texture(uGradient, vec2(clamp(position, 0.0, 1.0), 0.5)).rgb; }

void main() {
  vec2 frag = gl_FragCoord.xy;
  float time = uTime * uSpeed;
  vec2 centered = frag - uResolution * 0.5;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 rayUv = centered / max(uResolution.y, 1.0);
  vec3 direction = normalize(vec3(rayUv * 2.0, 1.0));
  vec3 accumulated = vec3(0.0);
  float march = 0.0;
  float noise = hash21(frag * 0.08 + time * 0.04);
  mat2 spin = rotate(time * 0.18);
  vec2 mouse = (uMouse - 0.5) * 2.0;

  for (int index = 0; index < 46; index++) {
    vec3 point = march * direction;
    point.z -= 1.8;
    float radius = length(point);
    vec3 warped = point * (7.5 / max(radius, 0.001));
    warped.xz = spin * warped.xz;
    warped.xy = rotate(mouse.x * 0.16) * warped.xy;
    float bend = uDistort * 0.12;
    warped.xz = rotate(bend * sin(warped.y * 0.7 + time * 0.4)) * warped.xz;
    warped.xy = rotate(bend * sin(warped.z * 0.6 - time * 0.3)) * warped.xy;
    float pattern = sin(warped.x + cos(warped.y) * cos(warped.z));
    pattern *= sin(warped.z + sin(warped.y) * cos(warped.x + time));
    float rays = smoothstep(0.28, 0.78, pattern);
    if (uRayCount > 0) {
      float angle = atan(warped.y, warped.x);
      float comb = pow(0.5 + 0.5 * cos(float(uRayCount) * angle), 3.0);
      rays *= smoothstep(0.2, 0.95, comb);
    }
    float stepLength = 0.1 + noise * 0.035;
    float falloff = smoothstep(5.0, 0.15, radius);
    float gradientPosition = fract(march * 0.28);
    vec3 spectral = uColorCount > 0 ? gradient(gradientPosition * gradientPosition * (3.0 - 2.0 * gradientPosition)) : vec3(1.0);
    accumulated += (0.055 / (0.35 + stepLength)) * falloff * rays * spectral;
    march += stepLength;
  }

  float distanceFromCenter = length(vec2(centered.x / max(uResolution.x, 1.0), centered.y / max(uResolution.y, 1.0)) * vec2(aspect, 1.0));
  float edgeFade = 1.0 - smoothstep(0.62, 1.22, distanceFromCenter);
  accumulated *= edgeFade * uIntensity;
  float rayStrength = clamp(max(max(accumulated.r, accumulated.g), accumulated.b), 0.0, 1.0);
  vec3 rayColor = accumulated / max(rayStrength, 0.001);
  fragColor = vec4(mix(uBackground, rayColor, rayStrength), 1.0);
}`;

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "").trim();
  const normalized = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
  const number = Number.parseInt(normalized.slice(0, 6), 16);
  if (!Number.isFinite(number)) return [1, 1, 1];
  return [((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255];
}

function updateGradient(gl: OGLRenderingContext, texture: Texture, colors: string[]) {
  const data = new Uint8Array(colors.length * 4);
  colors.forEach((color, index) => {
    const [red, green, blue] = hexToRgb(color);
    data.set([red * 255, green * 255, blue * 255], index * 4);
    data[index * 4 + 3] = 255;
  });
  texture.image = data;
  texture.width = colors.length;
  texture.height = 1;
  texture.minFilter = gl.LINEAR;
  texture.magFilter = gl.LINEAR;
  texture.wrapS = gl.CLAMP_TO_EDGE;
  texture.wrapT = gl.CLAMP_TO_EDGE;
  texture.needsUpdate = true;
}

export function PrismaticBurst({ profile }: { profile: EffectProfile }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile.mode === "static") return;
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: false });
    const gl = renderer.gl;
    const canvas = gl.canvas;
    container.appendChild(canvas);
    const gradientTexture = new Texture(gl, { image: new Uint8Array([255, 255, 255, 255]), width: 1, height: 1 });
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uResolution: { value: [1, 1] }, uTime: { value: 0 }, uIntensity: { value: 3.3 }, uSpeed: { value: 0.4 },
        uMouse: { value: [0.5, 0.5] }, uDistort: { value: 10 }, uRayCount: { value: 0 }, uColorCount: { value: 0 },
        uGradient: { value: gradientTexture }, uBackground: { value: [0, 0, 0] },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const pointer = { x: 0.5, y: 0.5 };
    let time = 0;
    let last = performance.now();
    let frame = 0;

    const applyTheme = () => {
      const palette = getPrismaticPalette(document.documentElement.classList.contains("dark"));
      const [red, green, blue] = hexToRgb(palette.background);
      updateGradient(gl, gradientTexture, palette.colors);
      program.uniforms.uColorCount.value = palette.colors.length;
      program.uniforms.uBackground.value = [red, green, blue];
    };
    const resize = () => {
      renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
      program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    };
    const onPointerMove = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      pointer.x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(bounds.width, 1)));
      pointer.y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / Math.max(bounds.height, 1)));
    };
    const observer = new ResizeObserver(resize);
    const themeObserver = new MutationObserver(applyTheme);
    const render = (now: number) => {
      time += Math.min(0.05, (now - last) / 1000);
      last = now;
      const mouse = program.uniforms.uMouse.value as number[];
      mouse[0] += (pointer.x - mouse[0]) * 0.08;
      mouse[1] += (pointer.y - mouse[1]) * 0.08;
      program.uniforms.uTime.value = time;
      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(render);
    };

    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    container.addEventListener("pointermove", onPointerMove, { passive: true });
    observer.observe(container);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    applyTheme();
    resize();
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("pointermove", onPointerMove);
      observer.disconnect();
      themeObserver.disconnect();
      mesh.geometry.remove();
      program.remove();
      gl.deleteTexture(gradientTexture.texture);
      canvas.remove();
    };
  }, [profile.mode]);

  if (profile.mode === "static") {
    return <div className="fixed inset-0 bg-[var(--prismatic-background)]" data-effect="prismatic-burst" data-effect-layer="background" />;
  }

  return <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-[var(--prismatic-background)]" data-effect="prismatic-burst" data-effect-layer="background" />;
}
