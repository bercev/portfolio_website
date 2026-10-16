/**
 * "Neural ink" fullscreen-shader background.
 *
 * A bespoke fragment shader on `ogl` (domain-warped fbm flow field with
 * print-like contour lines — a token/attention-stream metaphor for the
 * portfolio's AI-research identity). Theme tokens feed the uniforms
 * (light = ink-on-paper, dark = luminous void); the static/mobile/enhanced
 * effect profiles map to frame budget. Replaces the Journey geometry
 * background; Journey remains available as a fallback (see app/page.tsx).
 */
"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

import type { EffectProfile } from "@/lib/effect-policy";

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
uniform float uOctaves;      // 2..5, set from the effect profile
uniform float uProgress;     // 0..1 scroll progress: crossfades warp chapters
uniform vec3 uBg;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uInkOnPaper;   // 1 = light/paper, 0 = dark/void
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
// Amplitude-normalized fbm so fewer octaves (mobile) keep the same exposure.
float fbm(vec2 p, float octaves) {
  float v = 0.0;
  float a = 0.5;
  float norm = 0.0;
  for (int i = 0; i < 5; i++) {
    float w = step(float(i) + 0.5, octaves);
    v += w * a * snoise(p);
    norm += w * a;
    p = p * 2.03 + vec2(11.3, 7.7);
    a *= 0.5;
  }
  return v / max(norm, 1e-4);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float aspect = iResolution.x / iResolution.y;
  vec2 ndc = (2.0 * frag - iResolution.xy) / iResolution.y;
  float t = iTime * uSpeed;
  float oct = clamp(uOctaves, 2.0, 5.0);

  // Pointer dents the domain; frozen at center when pointer effects are off.
  vec2 pndc = vec2(uPointer.x * aspect, uPointer.y);
  vec2 md = ndc - pndc;
  float dent = exp(-dot(md, md) / 0.36) * uPointerActive;

  // Large-scale domain-warped flow field (Quilez-style): broad ink swirls
  // with calm paper between them. uProgress drifts the chapter.
  vec2 p = ndc * 0.55 * mix(1.0, 1.25, uProgress) + md * dent * 0.3;
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.06), oct),
                fbm(p + vec2(5.2, 1.3) - t * 0.05, oct));
  vec2 r = vec2(fbm(p + 1.4 * q + vec2(1.7, 9.2) + t * 0.04, oct),
                fbm(p + 1.4 * q + vec2(8.3, 2.8) - t * 0.03, oct));
  float f = fbm(p + 1.4 * r, oct);

  // Ink pools where the field is high; wide print-like contour bands trace
  // the flow. Paper breathes elsewhere.
  float wash = smoothstep(-0.25, 0.55, f);
  float contour = 1.0 - smoothstep(0.0, 0.10, abs(fract(f * 1.8 + dent * 0.25) - 0.5));
  float stream = clamp(wash * 0.7 + contour * 0.9, 0.0, 1.0);

  // Palette: ink body, accent-lit ridges.
  vec3 body = mix(uBg, uInk, stream * 0.9);
  vec3 col = mix(body, uAccent, contour * 0.6);

  // Film grain + gentle vignette keep it photographic, not screensaver.
  float grain = (hash12(frag + fract(t) * 100.0) - 0.5) * 0.055;
  float vig = smoothstep(1.45, 0.45, length(ndc * vec2(0.72, 1.0)));
  col = col * mix(0.82, 1.0, vig) + grain;

  float paper = uInkOnPaper;
  // Light mode: single attenuation via the mix (the canvas uses multiply
  // blend and the layer opacity for restraint) — no extra alpha fade, which
  // washed the ink out.
  vec3 outCol = paper > 0.5 ? mix(uBg, col, clamp(stream * 1.1, 0.0, 1.0)) : col;
  fragColor = vec4(outCol, 1.0);
}`;

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return [1, 1, 1];
  return [
    Number.parseInt(m[1], 16) / 255,
    Number.parseInt(m[2], 16) / 255,
    Number.parseInt(m[3], 16) / 255,
  ];
}

function readTheme() {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const get = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;
  const isDark = root.classList.contains("dark");
  return {
    isDark,
    bg: get("--background", isDark ? "#141d2b" : "#f3f7fc"),
    // Ink: accent darkened on paper so it stains instead of glowing.
    ink: isDark
      ? get("--portfolio-accent", "#00d8ff")
      : get("--effect-glow", "#3f4856"),
    accent: get("--portfolio-accent", "#00d8ff"),
  };
}

export function ShaderBackdrop({ profile }: { profile: EffectProfile }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isStatic = profile.mode === "static";
    const isMobile = profile.mode === "mobile";

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2),
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
        uSpeed: { value: isMobile ? 0.3 : 0.45 },
        uOctaves: { value: isMobile ? 3 : 5 },
        uProgress: { value: 0 },
        uBg: { value: new Float32Array([1, 1, 1]) },
        uInk: { value: new Float32Array([0, 0, 0]) },
        uAccent: { value: new Float32Array([0, 1, 1]) },
        uPointer: { value: new Float32Array([0, 0]) },
        uPointerActive: { value: 0 },
        uInkOnPaper: { value: 1 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const setUniformColor = (name: string, hex: string) => {
      const [r, g, b] = hexToRgb(hex);
      const v = program.uniforms[name].value as Float32Array;
      v[0] = r;
      v[1] = g;
      v[2] = b;
    };

    const applyTheme = () => {
      const theme = readTheme();
      setUniformColor("uBg", theme.bg);
      setUniformColor("uInk", theme.ink);
      setUniformColor("uAccent", theme.accent);
      program.uniforms.uInkOnPaper.value = theme.isDark ? 0 : 1;
      // Ink-on-paper reads through multiply, like the existing AcidSquares.
      canvas.style.mixBlendMode = theme.isDark ? "normal" : "multiply";
      if (isStatic) draw(performance.now());
    };

    const pointerTarget = new Float32Array([0, 0]);
    const pointerCurrent = new Float32Array([0, 0]);
    let pointerActiveTarget = 0;
    let pointerActive = 0;
    const startedAt = performance.now();
    let frame = 0;
    let lastFrameAt = 0;
    let isVisible = true;
    let isPageVisible = !document.hidden;

    const draw = (time: number) => {
      program.uniforms.iTime.value = (time - startedAt) * 0.001;
      pointerCurrent[0] += (pointerTarget[0] - pointerCurrent[0]) * 0.06;
      pointerCurrent[1] += (pointerTarget[1] - pointerCurrent[1]) * 0.06;
      pointerActive += (pointerActiveTarget - pointerActive) * 0.06;
      const p = program.uniforms.uPointer.value as Float32Array;
      p[0] = pointerCurrent[0];
      p[1] = pointerCurrent[1];
      program.uniforms.uPointerActive.value = pointerActive;
      renderer.render({ scene: mesh });
    };

    const render = (time: number) => {
      // Mobile: ~30fps cap via frame skipping — half the GPU cost, same look.
      if (isMobile && time - lastFrameAt < 33) {
        frame = requestAnimationFrame(render);
        return;
      }
      lastFrameAt = time;
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

    const resize = () => {
      // Mobile renders at half resolution: cheapest possible WebGL workload.
      const scale = isMobile ? 0.5 : 1;
      const width = Math.max(1, Math.floor(container.clientWidth * scale));
      const height = Math.max(1, Math.floor(container.clientHeight * scale));
      renderer.setSize(width, height);
      const res = program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      if (isStatic) draw(performance.now());
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!profile.pointerEffects) return;
      const bounds = container.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        pointerActiveTarget = 0;
        return;
      }
      pointerTarget[0] = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointerTarget[1] = -((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      pointerActiveTarget = 1;
    };

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      program.uniforms.uProgress.value = max > 0 ? window.scrollY / max : 0;
      if (isStatic) draw(performance.now());
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
      attributeFilter: ["class"],
    });
    if (!isStatic) {
      intersectionObserver.observe(container);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("visibilitychange", () => {
        isPageVisible = !document.hidden;
        if (isPageVisible) start();
        else stop();
      });
    }
    applyTheme();
    resize();
    onScroll();
    // Static profile: exactly one composed frame at a fixed seed.
    if (isStatic) draw(startedAt);
    else start();

    return () => {
      stop();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      mesh.geometry.remove();
      program.remove();
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [profile.mode, profile.pointerEffects]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden"
      data-effect="shader-backdrop"
      data-effect-layer="background"
    />
  );
}
