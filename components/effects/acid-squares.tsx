"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

import type { EffectProfile } from "@/lib/effect-policy";
import {
  ACID_SQUARES_HIGH_SPREAD_TONE_POWER,
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
uniform float uDensity;
uniform float uSpread;
uniform float uStepSize;
uniform float uGlow;
uniform float uExposure;
uniform float uColorShift;
uniform float uContrast;
uniform float uBrightness;
uniform float uOpacity;
uniform float uSteps;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uMouseRadius;
uniform float uMouseActive;
out vec4 fragColor;

void main() {
  vec2 frag = gl_FragCoord.xy;
  float zoom = max(uZoom, 0.05);
  float aspect = iResolution.x / iResolution.y;
  vec2 ndc = (2.0 * frag - iResolution.xy) / iResolution.y;
  vec2 dir = ndc * (0.5 / zoom);

  vec2 mouseNdc = vec2(uMouse.x * aspect, uMouse.y);
  float mr = max(uMouseRadius, 0.01);
  vec2 md = ndc - mouseNdc;
  float dent = exp(-dot(md, md) / (mr * mr)) *
    (3.0 * uMouseStrength * uMouseActive);

  float travel = sin(iTime * uSpeed) * uWaveDepth;
  float density = max(uDensity, 1.0);
  float spread = clamp(uSpread, 0.05, ${ACID_SQUARES_SPREAD_CEILING.toFixed(1)});
  float stepSize = max(uStepSize, 0.0005);
  float glowGain = max(uGlow, 0.0);

  vec3 tOffset = vec3(0.0, dent, travel);
  vec3 p = vec3(0.0);
  float s = 0.0;
  float glow = 0.0;

  for (int i = 0; i < 64; i++) {
    if (float(i) >= uSteps) break;
    p += vec3(dir * s, s);
    vec3 q = p + tOffset;
    s += density - length(q.xz) + length(ceil(q).xy);
    s = stepSize + abs(s) * spread;
    glow += glowGain / s;
  }

  float e = glow / max(uExposure, 1.0);
  float shimmer = 0.5 + 0.5 *
    dot(cos(iTime * uColorShift + p), vec3(0.3333));
  float v = tanh(e * uBrightness * mix(0.7, 1.05, shimmer));
  v = clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0);
  float highSpreadMix = smoothstep(0.6, 1.17, uSpread);
  float tonePower = mix(
    1.0,
    ${ACID_SQUARES_HIGH_SPREAD_TONE_POWER.toFixed(1)},
    highSpreadMix
  );
  v = pow(v, tonePower);

  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, 0.55, v));
  col = mix(col, uColor3, smoothstep(0.55, 1.0, v));
  col *= v;

  float a = clamp(v, 0.0, 1.0) * uOpacity;
  fragColor = vec4(col * a, a);
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
        uSpeed: { value: 0.75 },
        uWaveDepth: { value: 1 },
        uZoom: { value: 1.5 },
        uDensity: { value: 10.5 },
        uSpread: { value: 0.24 },
        uStepSize: { value: 0.001 },
        uGlow: { value: 0.95 },
        uExposure: { value: 3450 },
        uColorShift: { value: 0 },
        uContrast: { value: 1 },
        uBrightness: { value: 1 },
        uOpacity: { value: 1 },
        uSteps: { value: 32 },
        uColor1: { value: hexToRgb("#ffffff") },
        uColor2: { value: hexToRgb("#000000") },
        uColor3: { value: hexToRgb("#ffffff") },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseStrength: { value: 0.1 },
        uMouseRadius: { value: 0.51 },
        uMouseActive: { value: 0 },
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
