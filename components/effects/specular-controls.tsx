"use client";

import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";

import styles from "./specular-controls.module.css";

const CANVAS_PADDING = 16;
const DEFAULT_TARGET_SELECTOR = "button.cursor-target, a.cursor-target";

const VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = sdRoundedRect(p, uHalfSize, uRadius);
  vec2 lightDirection = vec2(cos(uAngle), sin(uAngle));
  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.32;

  vec2 ellipticalNormal = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(ellipticalNormal, lightDirection)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(
    uShineSize - uShineFade,
    uShineSize + uShineFade + 1e-4,
    phi
  );
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float highlight = line * rim * edgeClamp * uIntensity;

  vec3 color = uBaseColor * base + uLineColor * highlight;
  float alpha = clamp(base + highlight, 0.0, 1.0);
  fragColor = vec4(color, alpha);
}
`;

export type SpecularControlsProps = {
  targetSelector?: string;
  lineColorToken?: string;
  baseColorToken?: string;
  intensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
};

function readToken(token: string, fallback: string) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return value.startsWith("#") ? value : fallback;
}

function getTarget(eventTarget: EventTarget | null, selector: string) {
  return eventTarget instanceof Element
    ? eventTarget.closest<HTMLElement>(selector)
    : null;
}

export function SpecularControls({
  targetSelector = DEFAULT_TARGET_SELECTOR,
  lineColorToken = "--effect-cursor",
  baseColorToken = "--border",
  intensity = 0.72,
  shineSize = 8,
  shineFade = 34,
  thickness = 0.85,
}: SpecularControlsProps) {
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: Renderer;
    let program: Program;
    let mesh: Mesh;
    let geometry: Triangle;

    try {
      renderer = new Renderer({
        alpha: true,
        antialias: true,
        depth: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        premultipliedAlpha: true,
      });
      const { gl } = renderer;
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      geometry = new Triangle(gl);
      if (geometry.attributes.uv) delete geometry.attributes.uv;

      program = new Program(gl, {
        vertex: VERTEX_SHADER,
        fragment: FRAGMENT_SHADER,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uCenter: { value: [0, 0] },
          uHalfSize: { value: [1, 1] },
          uRadius: { value: 0 },
          uAngle: { value: 2.4 },
          uPx: { value: renderer.dpr },
          uLineColor: { value: [0, 0.85, 1] },
          uBaseColor: { value: [0.32, 0.32, 0.32] },
          uIntensity: { value: 0 },
          uShineSize: { value: (shineSize * Math.PI) / 180 },
          uShineFade: { value: (shineFade * Math.PI) / 180 },
          uThickness: { value: thickness * renderer.dpr },
          uBaseWidth: { value: renderer.dpr },
        },
      });
      mesh = new Mesh(gl, { geometry, program });
      host.appendChild(gl.canvas);
    } catch {
      host.dataset.specularUnavailable = "true";
      return;
    }

    const { gl } = renderer;
    const lineColor = new Color();
    const baseColor = new Color();
    const resizeObserver = new ResizeObserver(() => updateLayout());
    let activeTarget: HTMLElement | null = null;
    let pointerX = 0;
    let pointerY = 0;
    let angle = 2.4;
    let brightness = 0;
    let lastFrame = performance.now();
    let animationFrame: number | null = null;

    const updateColors = () => {
      lineColor.set(readToken(lineColorToken, "#00d8ff"));
      baseColor.set(readToken(baseColorToken, "#64748b"));
      program.uniforms.uLineColor.value = [
        lineColor.r,
        lineColor.g,
        lineColor.b,
      ];
      program.uniforms.uBaseColor.value = [
        baseColor.r,
        baseColor.g,
        baseColor.b,
      ];
    };

    const updateLayout = () => {
      if (!activeTarget) return;
      const rect = activeTarget.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const radius = Number.parseFloat(
        getComputedStyle(activeTarget).borderTopLeftRadius,
      );

      host.style.transform = `translate3d(${rect.left - CANVAS_PADDING}px, ${rect.top - CANVAS_PADDING}px, 0)`;
      renderer.setSize(
        width + CANVAS_PADDING * 2,
        height + CANVAS_PADDING * 2,
      );
      program.uniforms.uCenter.value = [
        (CANVAS_PADDING + width / 2) * renderer.dpr,
        (CANVAS_PADDING + height / 2) * renderer.dpr,
      ];
      program.uniforms.uHalfSize.value = [
        (width / 2) * renderer.dpr,
        (height / 2) * renderer.dpr,
      ];
      program.uniforms.uRadius.value =
        Math.min(Number.isFinite(radius) ? radius : 0, width / 2, height / 2) *
        renderer.dpr;
    };

    const render = (now: number) => {
      if (!activeTarget) {
        animationFrame = null;
        return;
      }

      const elementAtPointer = document.elementFromPoint(pointerX, pointerY);
      if (getTarget(elementAtPointer, targetSelector) !== activeTarget) {
        deactivate();
        return;
      }

      updateLayout();

      const rect = activeTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const normalizedX = (pointerX - centerX) / Math.max(rect.width / 2, 1);
      const normalizedY = (centerY - pointerY) / Math.max(rect.height / 2, 1);
      const targetAngle =
        Math.atan2(2 / Math.max(rect.height, 1), -2 / Math.max(rect.width, 1)) +
        normalizedX * 0.22 +
        normalizedY * 0.12;
      const delta = Math.min((now - lastFrame) / 1000, 0.05);
      const angleDifference =
        ((targetAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

      lastFrame = now;
      angle += angleDifference * (1 - Math.exp(-delta * 7));
      brightness += (1 - brightness) * (1 - Math.exp(-delta * 8));
      program.uniforms.uAngle.value = angle;
      program.uniforms.uIntensity.value = intensity * brightness;
      renderer.render({ scene: mesh });
      animationFrame = window.requestAnimationFrame(render);
    };

    const startRendering = () => {
      if (animationFrame !== null) return;
      lastFrame = performance.now();
      animationFrame = window.requestAnimationFrame(render);
    };

    const activate = (target: HTMLElement, x: number, y: number) => {
      if (activeTarget !== target) {
        if (activeTarget) resizeObserver.unobserve(activeTarget);
        activeTarget = target;
        resizeObserver.observe(target);
        brightness = 0;
        updateColors();
        updateLayout();
      }
      pointerX = x;
      pointerY = y;
      host.dataset.specularActive = "true";
      startRendering();
    };

    const deactivate = () => {
      if (activeTarget) resizeObserver.unobserve(activeTarget);
      activeTarget = null;
      host.dataset.specularActive = "false";
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };

    const handlePointerOver = (event: PointerEvent) => {
      const target = getTarget(event.target, targetSelector);
      if (target) activate(target, event.clientX, event.clientY);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!activeTarget) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!activeTarget) return;
      const nextTarget = getTarget(event.relatedTarget, targetSelector);
      if (nextTarget === activeTarget) return;
      deactivate();
    };

    const themeObserver = new MutationObserver(updateColors);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });
    window.addEventListener("pointerover", handlePointerOver, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointerover", handlePointerOver);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
      geometry.remove();
      program.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [
    baseColorToken,
    intensity,
    lineColorToken,
    shineFade,
    shineSize,
    targetSelector,
    thickness,
  ]);

  return (
    <span
      ref={hostRef}
      className={styles.overlay}
      data-specular-controls
      data-specular-active="false"
      aria-hidden="true"
    />
  );
}
