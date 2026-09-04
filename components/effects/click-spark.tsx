"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

import { usePalette } from "@/components/providers/palette-provider";
import { THEME_PALETTES } from "@/lib/theme-palette";

type Spark = {
  x: number;
  y: number;
  angle: number;
  startTime: number;
  radius: number;
};

export type ClickSparkProps = {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
};

type SparkSegmentInput = {
  x: number;
  y: number;
  angle: number;
  progress: number;
  sparkSize: number;
  sparkRadius: number;
};

type CanvasSizeInput = {
  width: number;
  height: number;
  pixelRatio: number;
};

export const CLICK_SPARK_DEFAULTS = {
  sparkColor: "#000000",
  sparkSize: 10,
  sparkRadius: 20,
  sparkCount: 7,
  duration: 600,
} satisfies Required<ClickSparkProps>;

export function getClickSparkColor(
  accent: string | undefined,
  resolvedTheme: string | undefined,
) {
  return (
    accent ??
    (resolvedTheme === "dark" ? "#ffffff" : CLICK_SPARK_DEFAULTS.sparkColor)
  );
}

export function calculateCanvasSize({
  width,
  height,
  pixelRatio,
}: CanvasSizeInput) {
  const scale = Math.min(Math.max(pixelRatio, 1), 2);

  return {
    pixelWidth: Math.round(width * scale),
    pixelHeight: Math.round(height * scale),
    cssWidth: `${width}px`,
    cssHeight: `${height}px`,
    scale,
  };
}

export function calculateSparkSegment({
  x,
  y,
  angle,
  progress,
  sparkSize,
  sparkRadius,
}: SparkSegmentInput) {
  const eased = progress * (2 - progress);
  const distance = eased * sparkRadius;
  const lineLength = sparkSize * (1 - eased);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    startX: x + distance * cos,
    startY: y + distance * sin,
    endX: x + (distance + lineLength) * cos,
    endY: y + (distance + lineLength) * sin,
  };
}

export function resolveSparkBurst({
  sparkCount,
  sparkRadius,
  richer = false,
}: {
  sparkCount: number;
  sparkRadius: number;
  richer?: boolean;
}) {
  if (!richer) {
    return { sparkCount, sparkRadius };
  }

  return {
    sparkCount: sparkCount + 4,
    sparkRadius: Math.round(sparkRadius * 1.35),
  };
}

export function isVitaeSparkTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest("[data-vitae-artifact]"))
  );
}

export function ClickSpark({
  sparkColor,
  sparkSize = CLICK_SPARK_DEFAULTS.sparkSize,
  sparkRadius = CLICK_SPARK_DEFAULTS.sparkRadius,
  sparkCount = CLICK_SPARK_DEFAULTS.sparkCount,
  duration = CLICK_SPARK_DEFAULTS.duration,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { palette } = usePalette();
  const { resolvedTheme } = useTheme();
  const resolvedSparkColor =
    sparkColor ??
    getClickSparkColor(
      palette === null ? undefined : THEME_PALETTES[palette].accent,
      resolvedTheme,
    );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const sparks: Spark[] = [];
    let animationFrame: number | null = null;
    let viewportWidth = 0;
    let viewportHeight = 0;

    const resize = () => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      const size = calculateCanvasSize({
        width: viewportWidth,
        height: viewportHeight,
        pixelRatio: window.devicePixelRatio || 1,
      });
      canvas.width = size.pixelWidth;
      canvas.height = size.pixelHeight;
      canvas.style.width = size.cssWidth;
      canvas.style.height = size.cssHeight;
      context.setTransform(size.scale, 0, 0, size.scale, 0, 0);
    };

    const draw = (timestamp: number) => {
      context.clearRect(0, 0, viewportWidth, viewportHeight);

      for (let index = sparks.length - 1; index >= 0; index -= 1) {
        const spark = sparks[index];
        const elapsed = timestamp - spark.startTime;

        if (elapsed >= duration) {
          sparks.splice(index, 1);
          continue;
        }

        const segment = calculateSparkSegment({
          x: spark.x,
          y: spark.y,
          angle: spark.angle,
          progress: elapsed / duration,
          sparkSize,
          sparkRadius: spark.radius,
        });

        context.strokeStyle = resolvedSparkColor;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(segment.startX, segment.startY);
        context.lineTo(segment.endX, segment.endY);
        context.stroke();
      }

      animationFrame =
        sparks.length > 0 ? window.requestAnimationFrame(draw) : null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      const startTime = performance.now();
      const burst = resolveSparkBurst({
        sparkCount,
        sparkRadius,
        richer: isVitaeSparkTarget(event.target),
      });

      for (let index = 0; index < burst.sparkCount; index += 1) {
        sparks.push({
          x: event.clientX,
          y: event.clientY,
          angle: (Math.PI * 2 * index) / burst.sparkCount,
          startTime,
          radius: burst.sparkRadius,
        });
      }

      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", handlePointerDown);
      sparks.length = 0;
      context.clearRect(0, 0, viewportWidth, viewportHeight);
    };
  }, [duration, resolvedSparkColor, sparkCount, sparkRadius, sparkSize]);

  return (
    <canvas
      ref={canvasRef}
      data-effect="click-spark"
      data-click-spark
      data-spark-color={resolvedSparkColor}
      data-effect-layer="pointer"
    />
  );
}
