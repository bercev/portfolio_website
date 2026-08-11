"use client";

import { useEffect, useRef } from "react";

import type { EffectProfile } from "@/lib/effect-policy";

type Particle = {
  angle: number;
  distance: number;
  drift: number;
  size: number;
  speed: number;
};

function seeded(index: number, offset: number) {
  const value = Math.sin(index * 91.73 + offset * 17.17) * 43758.5453;
  return value - Math.floor(value);
}

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => ({
    angle: seeded(index, 1) * Math.PI * 2,
    distance: 0.12 + seeded(index, 2) * 0.7,
    drift: 0.25 + seeded(index, 3) * 0.75,
    size: 0.75 + seeded(index, 4) * 2.25,
    speed: 0.12 + seeded(index, 5) * 0.22,
  }));
}

export function PrismaticBurst({ profile }: { profile: EffectProfile }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (profile.mode === "static") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const primary = rootStyles.getPropertyValue("--effect-prismatic-primary").trim();
    const secondary = rootStyles
      .getPropertyValue("--effect-prismatic-secondary")
      .trim();
    const particles = createParticles(profile.particleCount);
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

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const centerX = width * 0.72;
      const centerY = height * 0.18;
      const radius = Math.hypot(width, height);

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const phase = time * 0.0001 * particle.speed;
        const angle = particle.angle + Math.sin(phase + index) * 0.12;
        const travel =
          ((particle.distance + phase * particle.drift) % 0.88) * radius;
        const x = centerX + Math.cos(angle) * travel;
        const y = centerY + Math.sin(angle) * travel;
        const tailX = centerX + Math.cos(angle) * Math.max(0, travel - radius * 0.12);
        const tailY = centerY + Math.sin(angle) * Math.max(0, travel - radius * 0.12);
        const gradient = context.createLinearGradient(tailX, tailY, x, y);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.65, index % 2 === 0 ? secondary : primary);
        gradient.addColorStop(1, primary);

        context.globalAlpha = 0.08 + seeded(index, 6) * 0.18;
        context.strokeStyle = gradient;
        context.lineWidth = particle.size;
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(x, y);
        context.stroke();
      }

      context.globalAlpha = 1;
      frame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      context.clearRect(0, 0, width, height);
    };
  }, [profile.mode, profile.particleCount]);

  if (profile.mode === "static") {
    return (
      <div
        className="fixed inset-0 bg-[radial-gradient(circle_at_72%_18%,color-mix(in_srgb,var(--effect-prismatic-primary)_18%,transparent),transparent_38%),radial-gradient(circle_at_18%_72%,color-mix(in_srgb,var(--effect-prismatic-secondary)_12%,transparent),transparent_34%)]"
        data-effect="prismatic-burst"
        data-effect-layer="background"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      data-effect="prismatic-burst"
      data-effect-layer="background"
    />
  );
}
