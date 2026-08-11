"use client";

import { useEffect, useRef } from "react";

const INTERPOLATE = 2.7;
const MAX_AGE = 300;
const GOO_STRENGTH = 1;
const GRID_SIZE = 90;

type TrailPoint = {
  x: number;
  y: number;
  createdAt: number;
};

export function PixelTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const points: TrailPoint[] = [];
    const rootStyles = getComputedStyle(document.documentElement);
    const color = rootStyles.getPropertyValue("--effect-trail").trim();
    let previous: TrailPoint | null = null;
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const current = { x: event.clientX, y: event.clientY, createdAt: now };

      if (previous) {
        const distance = Math.hypot(
          current.x - previous.x,
          current.y - previous.y,
        );
        const cellSize = Math.max(4, width / GRID_SIZE);
        const steps = Math.max(1, Math.ceil(distance / (cellSize * INTERPOLATE)));

        for (let step = 1; step <= steps; step += 1) {
          const progress = step / steps;
          points.push({
            x: previous.x + (current.x - previous.x) * progress,
            y: previous.y + (current.y - previous.y) * progress,
            createdAt: now,
          });
        }
      } else {
        points.push(current);
      }

      previous = current;
    };

    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      const cellSize = Math.max(4, width / GRID_SIZE);

      while (points.length > 0 && now - points[0].createdAt > MAX_AGE) {
        points.shift();
      }

      context.fillStyle = color;
      context.filter = `blur(${GOO_STRENGTH}px)`;
      context.globalCompositeOperation = "lighter";

      for (const point of points) {
        const age = now - point.createdAt;
        const opacity = Math.max(0, 1 - age / MAX_AGE);
        const x = Math.floor(point.x / cellSize) * cellSize;
        const y = Math.floor(point.y / cellSize) * cellSize;
        context.globalAlpha = opacity * 0.72;
        context.fillRect(x, y, cellSize, cellSize);
      }

      context.globalAlpha = 1;
      context.filter = "none";
      context.globalCompositeOperation = "source-over";
      frame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      points.length = 0;
      context.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-effect="pixel-trail"
      data-effect-layer="pointer"
    />
  );
}
