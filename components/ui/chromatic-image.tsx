/**
 * Chromatic Image — Aceternity UI mechanism, copied and owned.
 *
 * An interactive image with pointer-driven RGB channel separation,
 * horizontal displacement, and perspective tilt, rendered by a native
 * WebGL shader (no scene library, no new dependency — the catalog's own
 * description). The loop's adoption terms, from the STATE.md backlog item:
 *
 * - Separation + tilt ONLY. Displacement defaults to 0: the Vitae
 *   screenshot is proof, not decoration, so the image must not slide.
 * - Amplitudes stay whisper-small and clearly below the background's
 *   velocity fling fringes (chromaticShift 0.008 < the catalog's 0.01).
 * - Hover-driven, so it owns a different axis from the scroll-velocity
 *   background split — no double-ownership.
 * - Idle stop (the ASCIIText forever-rAF lesson): rendering is on-demand.
 *   The rAF loop runs only while the pointer is inside or the settle
 *   decay is finishing, then cancels. preserveDrawingBuffer is true
 *   precisely because rendering is on-demand — with it false, the
 *   compositor may blank a statically rendered frame on repaint.
 * - Reduced motion renders the plain <img> (no canvas at all); touch
 *   devices (no hover) and any WebGL/texture failure also fall back to
 *   the <img>, so the preview always reads at rest.
 * - Raster only: the Discord chatbot preview is an SVG illustration and
 *   stays a static <img> (SVG texture uploads risk wrong intrinsic size).
 */
"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  chromaticShiftForPointer,
  coverTransform,
  tiltForPointer,
} from "@/lib/chromatic-image-math";

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_scale;
uniform vec2 u_offset;
uniform vec2 u_shift;
uniform float u_displacement;
varying vec2 v_uv;
void main() {
  vec2 base = v_uv * u_scale + u_offset + vec2(u_displacement, 0.0);
  float r = texture2D(u_tex, base + u_shift).r;
  float g = texture2D(u_tex, base).g;
  float b = texture2D(u_tex, base - u_shift).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export type ChromaticImageProps = {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  /** UV distance between separated channels at full pointer deflection. */
  readonly chromaticShift?: number;
  /** Horizontal image displacement in UV units. Default 0 (proof, not decor). */
  readonly displacement?: number;
  /** Max perspective tilt in degrees at full pointer deflection. */
  readonly tiltMaxDeg?: number;
  readonly className?: string;
};

export function ChromaticImage({
  src,
  alt,
  width,
  height,
  chromaticShift = 0.008,
  displacement = 0,
  tiltMaxDeg = 4,
  className,
}: ChromaticImageProps) {
  const shouldReduceMotion = useReducedMotion();
  const [canHover, setCanHover] = useState(false);
  const [fallback, setFallback] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: hover)").matches) setCanHover(true);
  }, []);

  const interactive = canHover && !shouldReduceMotion && !fallback;

  useEffect(() => {
    if (!interactive) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      setFallback(true);
      return;
    }
    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) {
      setFallback(true);
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      setFallback(true);
      return;
    }
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTex = gl.getUniformLocation(program, "u_tex");
    const uScale = gl.getUniformLocation(program, "u_scale");
    const uOffset = gl.getUniformLocation(program, "u_offset");
    const uShift = gl.getUniformLocation(program, "u_shift");
    const uDisplacement = gl.getUniformLocation(program, "u_displacement");
    gl.uniform1i(uTex, 0);
    gl.uniform1f(uDisplacement, displacement);

    // Animation state lives outside React: pointer frames must not
    // re-render. target/current are normalized pointer offsets [-1, 1].
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;
    let lastT = 0;
    let texture: WebGLTexture | null = null;
    let imgW = 0;
    let imgH = 0;

    const render = () => {
      if (!texture) return;
      const shift = chromaticShiftForPointer(current.x, current.y, chromaticShift);
      gl.uniform2f(uShift, shift.x, shift.y);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const applyTilt = () => {
      const tilt = tiltForPointer(current.x, current.y, tiltMaxDeg);
      wrap.style.transform = `perspective(900px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`;
    };

    const loop = (t: number) => {
      const dt = lastT === 0 ? 0.016 : Math.min((t - lastT) / 1000, 0.05);
      lastT = t;
      // Critically-damped-ish ease: 1 - exp(-dt * 12) settles in ~0.3s.
      const k = 1 - Math.exp(-dt * 12);
      current.x += (target.x - current.x) * k;
      current.y += (target.y - current.y) * k;
      applyTilt();
      render();
      const settled =
        Math.abs(target.x - current.x) < 0.001 &&
        Math.abs(target.y - current.y) < 0.001;
      if (settled) {
        current.x = target.x;
        current.y = target.y;
        applyTilt();
        render();
        if (target.x === 0 && target.y === 0) wrap.style.transform = "";
        raf = 0;
        lastT = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const kick = () => {
      if (!raf) {
        lastT = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    const syncCover = () => {
      if (!imgW || !imgH) return;
      const t = coverTransform(canvas.width, canvas.height, imgW, imgH);
      gl.uniform2f(uScale, t.scaleX, t.scaleY);
      gl.uniform2f(uOffset, t.offsetX, t.offsetY);
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      syncCover();
      render();
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      target.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      target.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      kick();
    };

    const onPointerLeave = () => {
      target.x = 0;
      target.y = 0;
      kick();
    };

    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();

    const image = new Image();
    image.onload = () => {
      imgW = image.naturalWidth;
      imgH = image.naturalHeight;
      texture = gl.createTexture();
      if (!texture) {
        setFallback(true);
        return;
      }
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      syncCover();
      render();
    };
    image.onerror = () => setFallback(true);
    image.src = src;

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.style.transform = "";
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    };
  }, [interactive, src, chromaticShift, displacement, tiltMaxDeg]);

  if (!interactive) {
    return (
      <span className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local static preview crop */}
        <img src={src} alt={alt} width={width} height={height} />
      </span>
    );
  }

  return (
    <span
      ref={wrapRef}
      className={className}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        data-chromatic-image
      />
    </span>
  );
}
