"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

import type { EffectProfile } from "@/lib/effect-policy";
import {
  ACID_SQUARES_SPREAD_CEILING,
  getAcidSquaresTheme,
} from "@/lib/acid-squares-theme";

const vertexShader = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentShader = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uWaveDepth;
uniform float uZoom;
uniform float uSpread;
uniform float uGlow;
uniform float uColorShift;
uniform float uContrast;
uniform float uBrightness;
uniform float uOpacity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uMouseRadius;
uniform float uMouseActive;
uniform float uInkOnPaper;
out vec4 fragColor;

vec3 mod289(vec3 x) { return mod(x, 289.0); }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
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
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p);
    p = p * 2.03 + vec2(11.3, 7.7);
    a *= 0.5;
  }
  return v;
}
vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
// Irregular tide-pool cells (F2-F1), not a square lattice.
float tidePools(vec2 p, float t) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.44 * sin(6.28318 * o + t * 0.16 + o.yx * 2.15);
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
  }
  return d2 - d1;
}
// Diagonal kelp veins — breaks the leftover orthogonal grid.
float kelpVein(vec2 p, float t) {
  vec2 along = vec2(0.83, 0.56);
  vec2 across = vec2(-along.y, along.x);
  float ridge = abs(snoise(vec2(
    dot(p, along) * 0.34 + t * 0.07,
    dot(p, across) * 1.55
  )));
  return pow(1.0 - clamp(ridge, 0.0, 1.0), 5.4);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float zoom = max(uZoom, 0.05);
  float aspect = iResolution.x / iResolution.y;
  vec2 ndc = (2.0 * frag - iResolution.xy) / iResolution.y;

  vec2 mouseNdc = vec2(uMouse.x * aspect, uMouse.y);
  float mr = max(uMouseRadius, 0.01);
  vec2 md = ndc - mouseNdc;
  float dent = exp(-dot(md, md) / (mr * mr)) *
    (3.0 * uMouseStrength * uMouseActive);

  float t = iTime * uSpeed;
  float warp = uWaveDepth * 0.42;
  float spread = clamp(uSpread, 0.05, ${ACID_SQUARES_SPREAD_CEILING.toFixed(1)});
  float paper = uInkOnPaper;

  vec2 p = ndc * (1.15 / zoom);
  p += md * dent * 0.35;
  p += vec2(sin(p.y * 1.15 + t * 0.28) * warp, cos(p.x * 0.95 - t * 0.22) * warp);
  vec2 q = p + 0.62 * vec2(fbm(p + t * 0.05), fbm(p.yx * vec2(1.07, 0.91) - t * 0.04));
  float n = fbm(q * mix(1.05, 1.55, spread));
  float cellScale = mix(1.25, 2.05, spread) * mix(0.82, 1.22, 0.5 + 0.5 * n);
  float rim = pow(smoothstep(0.0, 0.24, tidePools(q * cellScale + n * 0.32, t)),
    mix(1.55, 2.35, spread));
  float vein = kelpVein(q + n * 0.38, t);
  float caustic = clamp(rim * 0.74 + vein * 0.52, 0.0, 1.0);
  float wash = smoothstep(-0.32, 0.76, n);
  float field = clamp(wash * 0.5 + caustic * max(uGlow, 0.2), 0.0, 1.0);
  float coverage = paper > 0.5
    ? clamp(wash * 0.82 + caustic * 1.2, 0.0, 1.0)
    : field;
  float shimmer = 0.5 + 0.5 * sin(t * max(uColorShift, 0.15) + n * 4.0);
  coverage = clamp((coverage - mix(0.5, 0.22, paper)) *
    mix(uContrast, 1.55, paper) + mix(0.5, 0.22, paper), 0.0, 1.0);
  coverage *= mix(0.8, 1.1, shimmer) * uBrightness;

  vec3 body = mix(uColor2, uColor3, caustic);
  // Paper: emit ink only so CSS paper shows through. Void: fade into base.
  vec3 col = paper > 0.5 ? body : mix(uColor1, body, coverage);
  float alpha = clamp(coverage * uOpacity, 0.0, 1.0);
  fragColor = vec4(col * alpha, alpha);
}`;

function hexToRgb(hex: string): Float32Array {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return new Float32Array([1, 1, 1]);

  return new Float32Array([
    Number.parseInt(match[1], 16) / 255,
    Number.parseInt(match[2], 16) / 255,
    Number.parseInt(match[3], 16) / 255,
  ]);
}

export function AcidSquares({ profile }: { profile: EffectProfile }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isStatic = profile.mode === "static";

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const canvas = gl.canvas;
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block";
    container.appendChild(canvas);

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: 0.42 },
        uWaveDepth: { value: 1.15 },
        uZoom: { value: 0.92 },
        uSpread: { value: 0.48 },
        uGlow: { value: 0.88 },
        uColorShift: { value: 0.35 },
        uContrast: { value: 1.05 },
        uBrightness: { value: 1 },
        uOpacity: { value: 1 },
        uColor1: { value: hexToRgb("#ffffff") },
        uColor2: { value: hexToRgb("#000000") },
        uColor3: { value: hexToRgb("#8aa0b0") },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseStrength: { value: 0.16 },
        uMouseRadius: { value: 0.62 },
        uMouseActive: { value: 0 },
        uInkOnPaper: { value: 1 },
      },
    });
    const mesh = new Mesh(gl, {
      geometry: new Triangle(gl),
      program,
    });
    const mouseTarget = new Float32Array([0, 0]);
    const mouseCurrent = new Float32Array([0, 0]);
    let mouseActiveTarget = 0;
    let mouseActive = 0;
    let frame = 0;
    let isPageVisible = !document.hidden;
    let isVisible = true;
    const startedAt = performance.now();

    const draw = (time: number) => {
      program.uniforms.iTime.value = (time - startedAt) * 0.001;
      mouseCurrent[0] += (mouseTarget[0] - mouseCurrent[0]) * 0.05;
      mouseCurrent[1] += (mouseTarget[1] - mouseCurrent[1]) * 0.05;
      mouseActive += (mouseActiveTarget - mouseActive) * 0.05;
      const mouse = program.uniforms.uMouse.value as Float32Array;
      mouse[0] = mouseCurrent[0];
      mouse[1] = mouseCurrent[1];
      program.uniforms.uMouseActive.value = mouseActive;
      renderer.render({ scene: mesh });
    };

    const redrawStatic = () => {
      if (isStatic) draw(startedAt);
    };

    const applyTheme = () => {
      const root = document.documentElement;
      const accent = root.hasAttribute("data-palette")
        ? getComputedStyle(root).getPropertyValue("--portfolio-accent").trim()
        : undefined;
      const theme = getAcidSquaresTheme(root.classList.contains("dark"), accent);
      program.uniforms.uColor1.value = hexToRgb(theme.colors[0]);
      program.uniforms.uColor2.value = hexToRgb(theme.colors[1]);
      program.uniforms.uColor3.value = hexToRgb(theme.colors[2]);
      program.uniforms.uSpread.value = theme.spread;
      program.uniforms.uInkOnPaper.value = theme.inkOnPaper ? 1 : 0;
      // globals.css holds the layer at 0.3 on paper / 0.5 in the void.
      // Paper needs more of that budget or the stain vanishes; multiply
      // keeps it a wash instead of a sheet.
      canvas.style.mixBlendMode = theme.inkOnPaper ? "multiply" : "normal";
      container.style.opacity = theme.inkOnPaper ? "0.58" : "";
      redrawStatic();
    };

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height);
      const resolution = program.uniforms.iResolution.value as Float32Array;
      resolution[0] = gl.drawingBufferWidth;
      resolution[1] = gl.drawingBufferHeight;
      redrawStatic();
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        mouseActiveTarget = 0;
        return;
      }

      mouseTarget[0] = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      mouseTarget[1] = -((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      mouseActiveTarget = 1;
    };

    const render = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (!isStatic && frame === 0 && isVisible && isPageVisible) {
        frame = requestAnimationFrame(render);
      }
    };
    const stop = () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) start();
      else stop();
    };

    const resizeObserver = new ResizeObserver(resize);
    const themeObserver = new MutationObserver(applyTheme);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) start();
      else stop();
    });

    resizeObserver.observe(container);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-palette"],
    });
    if (!isStatic) {
      intersectionObserver.observe(container);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    applyTheme();
    resize();
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      mesh.geometry.remove();
      program.remove();
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [profile.mode]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden bg-background"
      data-effect="acid-squares"
      data-effect-layer="background"
      data-grain="true"
      data-grain-intensity="0"
      data-blur="0"
    />
  );
}
