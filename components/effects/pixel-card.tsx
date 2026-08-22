"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

import "./pixel-card.css";

type PixelCardVariant = {
  activeColor: string | null;
  gap: number;
  speed: number;
  colors: string;
  noFocus: boolean;
};

export const PIXEL_CARD_VARIANTS: Record<string, PixelCardVariant> = {
  default: {
    activeColor: null,
    gap: 5,
    speed: 35,
    colors: "#f8fafc,#f1f5f9,#cbd5e1",
    noFocus: false,
  },
  blue: {
    activeColor: "#e0f2fe",
    gap: 10,
    speed: 25,
    colors: "#e0f2fe,#7dd3fc,#0ea5e9",
    noFocus: false,
  },
  yellow: {
    activeColor: "#fef08a",
    gap: 3,
    speed: 20,
    colors: "#fef08a,#fde047,#eab308",
    noFocus: false,
  },
  pink: {
    activeColor: "#fecdd3",
    gap: 6,
    speed: 80,
    colors: "#fecdd3,#fda4af,#e11d48",
    noFocus: true,
  },
};

export function getEffectivePixelSpeed(
  value: number,
  reducedMotion: boolean,
) {
  const parsed = Number.parseInt(String(value), 10);

  if (parsed <= 0 || reducedMotion) return 0;
  if (parsed >= 100) return 0.1;
  return parsed * 0.001;
}

class Pixel {
  private size = 0;
  private readonly minSize = 0.5;
  private readonly maxSizeInteger = 2;
  private readonly maxSize: number;
  private readonly sizeStep = Math.random() * 0.4;
  private counter = 0;
  private readonly counterStep: number;
  isIdle = false;
  private isReverse = false;
  private isShimmer = false;

  constructor(
    private readonly context: CanvasRenderingContext2D,
    private readonly x: number,
    private readonly y: number,
    private readonly color: string,
    private readonly speed: number,
    private readonly delay: number,
  ) {
    this.maxSize = Math.random() * (this.maxSizeInteger - this.minSize) + this.minSize;
    this.counterStep =
      Math.random() * 4 + (context.canvas.width + context.canvas.height) * 0.01;
  }

  draw() {
    const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
    this.context.fillStyle = this.color;
    this.context.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size);
  }

  appear() {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size >= this.maxSize) this.isShimmer = true;
    if (this.isShimmer) this.shimmer();
    else this.size += this.sizeStep;
    this.draw();
  }

  disappear() {
    this.isShimmer = false;
    this.counter = 0;
    if (this.size <= 0) {
      this.isIdle = true;
      return;
    }
    this.size -= 0.1;
    this.draw();
  }

  private shimmer() {
    if (this.size >= this.maxSize) this.isReverse = true;
    else if (this.size <= this.minSize) this.isReverse = false;
    if (this.isReverse) this.size -= this.speed;
    else this.size += this.speed;
  }
}

type PixelCardProps = {
  variant?: string;
  gap?: number;
  speed?: number;
  colors?: string;
  noFocus?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export function PixelCard({
  variant = "default",
  gap,
  speed,
  colors,
  noFocus,
  className = "",
  style,
  children,
}: PixelCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationRef = useRef<number | null>(null);
  const timePreviousRef = useRef(0);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const variantConfig = PIXEL_CARD_VARIANTS[variant] ?? PIXEL_CARD_VARIANTS.default;
  const finalGap = gap ?? variantConfig.gap;
  const finalSpeed = speed ?? variantConfig.speed;
  const finalColors = colors ?? variantConfig.colors;
  const finalNoFocus = noFocus ?? variantConfig.noFocus;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const initPixels = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width === 0 || height === 0) return;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const colorsArray = finalColors.split(",");
      const nextPixels: Pixel[] = [];
      for (let x = 0; x < width; x += Math.max(1, finalGap)) {
        for (let y = 0; y < height; y += Math.max(1, finalGap)) {
          const dx = x - width / 2;
          const dy = y - height / 2;
          const delay = reducedMotion ? 0 : Math.sqrt(dx * dx + dy * dy);
          nextPixels.push(
            new Pixel(
              context,
              x,
              y,
              colorsArray[Math.floor(Math.random() * colorsArray.length)],
              getEffectivePixelSpeed(finalSpeed, reducedMotion),
              delay,
            ),
          );
        }
      }
      pixelsRef.current = nextPixels;
    };

    const animate = (method: "appear" | "disappear") => {
      animationRef.current = requestAnimationFrame(() => animate(method));
      const now = performance.now();
      const elapsed = now - timePreviousRef.current;
      if (elapsed < 1000 / 60) return;
      timePreviousRef.current = now - (elapsed % (1000 / 60));
      context.clearRect(0, 0, canvas.width, canvas.height);
      let allIdle = true;
      for (const pixel of pixelsRef.current) {
        pixel[method]();
        if (!pixel.isIdle) allIdle = false;
      }
      if (allIdle) cancelAnimationFrame(animationRef.current);
    };

    const handleAnimation = (method: "appear" | "disappear") => {
      if (reducedMotion) return;
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      timePreviousRef.current = performance.now();
      animationRef.current = requestAnimationFrame(() => animate(method));
    };
    const onMouseEnter = () => handleAnimation("appear");
    const onMouseLeave = () => handleAnimation("disappear");
    const onFocus = (event: FocusEvent) => {
      if (!container.contains(event.relatedTarget as Node | null)) handleAnimation("appear");
    };
    const onBlur = (event: FocusEvent) => {
      if (!container.contains(event.relatedTarget as Node | null)) handleAnimation("disappear");
    };

    initPixels();
    const observer = new ResizeObserver(initPixels);
    observer.observe(container);
    container.addEventListener("mouseenter", onMouseEnter);
    container.addEventListener("mouseleave", onMouseLeave);
    if (!finalNoFocus) {
      container.addEventListener("focus", onFocus);
      container.addEventListener("blur", onBlur);
    }
    return () => {
      observer.disconnect();
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      container.removeEventListener("mouseenter", onMouseEnter);
      container.removeEventListener("mouseleave", onMouseLeave);
      container.removeEventListener("focus", onFocus);
      container.removeEventListener("blur", onBlur);
    };
  }, [finalColors, finalGap, finalNoFocus, finalSpeed, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`pixel-card ${className}`}
      style={style}
      tabIndex={finalNoFocus ? -1 : 0}
    >
      <canvas ref={canvasRef} className="pixel-canvas" aria-hidden="true" />
      {children}
    </div>
  );
}
