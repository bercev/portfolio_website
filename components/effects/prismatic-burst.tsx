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
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uSpeed;
uniform int uAnimType;
uniform vec2 uMouse;
uniform int uColorCount;
uniform float uDistort;
uniform vec2 uOffset;
uniform sampler2D uGradient;
uniform float uNoiseAmount;
uniform int uRayCount;

float hash21(vec2 p){
  p = floor(p);
  float f = 52.9829189 * fract(dot(p, vec2(0.065, 0.005)));
  return fract(f);
}

mat2 rot30(){ return mat2(0.8, -0.5, 0.5, 0.8); }

float layeredNoise(vec2 fragPx){
  vec2 p = mod(fragPx + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
  vec2 q = rot30() * p;
  float n = 0.0;
  n += 0.40 * hash21(q);
  n += 0.25 * hash21(q * 2.0 + 17.0);
  n += 0.20 * hash21(q * 4.0 + 47.0);
  n += 0.10 * hash21(q * 8.0 + 113.0);
  n += 0.05 * hash21(q * 16.0 + 191.0);
  return n;
}

vec3 rayDir(vec2 frag, vec2 res, vec2 offset, float dist){
  float focal = res.y * max(dist, 1e-3);
  return normalize(vec3(2.0 * (frag - offset) - res, focal));
}

float edgeFade(vec2 frag, vec2 res, vec2 offset){
  vec2 toC = frag - 0.5 * res - offset;
  float r = length(toC) / (0.5 * min(res.x, res.y));
  float x = clamp(r, 0.0, 1.0);
  float q = x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  float s = pow(q * 0.5, 1.5);
  float tail = 1.0 - pow(1.0 - s, 2.0);
  s = mix(s, tail, 0.2);
  float dn = (layeredNoise(frag * 0.15) - 0.5) * 0.0015 * s;
  return clamp(s + dn, 0.0, 1.0);
}

mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c,-s,0.0, s,c,0.0, 0.0,0.0,1.0); }

vec3 sampleGradient(float t){ return texture(uGradient, vec2(clamp(t, 0.0, 1.0), 0.5)).rgb; }

vec2 rot2(vec2 v, float a){
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c) * v;
}

float bendAngle(vec3 q, float t){
  return 0.8 * sin(q.x * 0.55 + t * 0.6)
       + 0.7 * sin(q.y * 0.50 - t * 0.5)
       + 0.6 * sin(q.z * 0.60 + t * 0.7);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float t = uTime * uSpeed;
  float jitterAmp = 0.1 * clamp(uNoiseAmount, 0.0, 1.0);
  vec3 dir = rayDir(frag, uResolution, uOffset, 1.0);
  float marchT = 0.0;
  vec3 col = vec3(0.0);
  float n = layeredNoise(frag);
  vec4 c = cos(t * 0.2 + vec4(0.0, 33.0, 11.0, 0.0));
  mat2 M2 = mat2(c.x, c.y, c.z, c.w);
  float amp = clamp(uDistort, 0.0, 50.0) * 0.15;
  mat3 rot3dMat = mat3(1.0);
  if(uAnimType == 1){
    vec3 ang = vec3(t * 0.31, t * 0.21, t * 0.17);
    rot3dMat = rotZ(ang.z) * rotY(ang.y) * rotX(ang.x);
  }
  mat3 hoverMat = mat3(1.0);
  if(uAnimType == 2){
    vec2 m = uMouse * 2.0 - 1.0;
    hoverMat = rotY(m.x * 0.6) * rotX(m.y * 0.6);
  }
  for (int i = 0; i < 44; ++i) {
    vec3 P = marchT * dir;
    P.z -= 2.0;
    float rad = length(P);
    vec3 Pl = P * (10.0 / max(rad, 1e-6));
    if(uAnimType == 0) Pl.xz *= M2;
    else if(uAnimType == 1) Pl = rot3dMat * Pl;
    else Pl = hoverMat * Pl;
    float stepLen = min(rad - 0.3, n * jitterAmp) + 0.1;
    float grow = smoothstep(0.35, 3.0, marchT);
    float a1 = amp * grow * bendAngle(Pl * 0.6, t);
    float a2 = 0.5 * amp * grow * bendAngle(Pl.zyx * 0.5 + 3.1, t * 0.9);
    vec3 Pb = Pl;
    Pb.xz = rot2(Pb.xz, a1);
    Pb.xy = rot2(Pb.xy, a2);
    float rayPattern = smoothstep(0.5, 0.7, sin(Pb.x + cos(Pb.y) * cos(Pb.z)) * sin(Pb.z + sin(Pb.y) * cos(Pb.x + t)));
    if (uRayCount > 0) {
      float ang = atan(Pb.y, Pb.x);
      float comb = pow(0.5 + 0.5 * cos(float(uRayCount) * ang), 3.0);
      rayPattern *= smoothstep(0.15, 0.95, comb);
    }
    vec3 spectralDefault = 1.0 + vec3(cos(marchT * 3.0), cos(marchT * 3.0 + 1.0), cos(marchT * 3.0 + 2.0));
    float saw = fract(marchT * 0.25);
    float tRay = saw * saw * (3.0 - 2.0 * saw);
    vec3 spectral = (uColorCount > 0) ? 2.0 * sampleGradient(tRay) : spectralDefault;
    vec3 base = (0.05 / (0.4 + stepLen)) * smoothstep(5.0, 0.0, rad) * spectral;
    col += base * rayPattern;
    marchT += stepLen;
  }
  col *= edgeFade(frag, uResolution, uOffset);
  col *= uIntensity;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
  texture.flipY = false;
  texture.generateMipmaps = false;
  texture.format = gl.RGBA;
  texture.type = gl.UNSIGNED_BYTE;
  texture.needsUpdate = true;
}

export function PrismaticBurst({ profile }: { profile: EffectProfile }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile.mode === "static") return;
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: false, antialias: false });
    const gl = renderer.gl;
    const canvas = gl.canvas;
    container.appendChild(canvas);
    const gradientTexture = new Texture(gl, {
      image: new Uint8Array([255, 255, 255, 255]),
      width: 1,
      height: 1,
      generateMipmaps: false,
      flipY: false,
    });
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uResolution: { value: [1, 1] }, uTime: { value: 0 }, uIntensity: { value: 3.3 }, uSpeed: { value: 0.4 },
        uAnimType: { value: 1 }, uMouse: { value: [0.5, 0.5] }, uColorCount: { value: 0 },
        uDistort: { value: 10 }, uOffset: { value: [0, 0] }, uGradient: { value: gradientTexture },
        uNoiseAmount: { value: 0.8 }, uRayCount: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const pointer = { x: 0.5, y: 0.5 };
    let time = 0;
    let last = performance.now();
    let frame = 0;

    const applyTheme = () => {
      const palette = getPrismaticPalette(document.documentElement.classList.contains("dark"));
      updateGradient(gl, gradientTexture, palette.colors);
      program.uniforms.uColorCount.value = palette.colors.length;
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

    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;mix-blend-mode:lighten";
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
