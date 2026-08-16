"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type Burst = {
  id: number;
  x: number;
  y: number;
};

export type ClickSparkProps = {
  sparkColor?: string
  sparkSize?: number
  sparkRadius?: number
  sparkCount?: number
  duration?: number
}

export const CLICK_SPARK_DEFAULTS = {
  sparkColor: "#00ffff",
  sparkSize: 10,
  sparkRadius: 20,
  sparkCount: 7,
  duration: 600,
} satisfies Required<ClickSparkProps>

export function ClickSpark({
  sparkColor = CLICK_SPARK_DEFAULTS.sparkColor,
  sparkSize = CLICK_SPARK_DEFAULTS.sparkSize,
  sparkRadius = CLICK_SPARK_DEFAULTS.sparkRadius,
  sparkCount = CLICK_SPARK_DEFAULTS.sparkCount,
  duration = CLICK_SPARK_DEFAULTS.duration,
}: ClickSparkProps) {
  const [bursts, setBursts] = useState<Burst[]>([])
  const nextId = useRef(0)
  const cleanupTimers = useRef(new Set<number>())

  useEffect(() => {
    const timers = cleanupTimers.current

    const handlePointerDown = (event: PointerEvent) => {
      const burst = {
        id: nextId.current,
        x: event.clientX,
        y: event.clientY,
      }
      nextId.current += 1
      setBursts((current) => [...current, burst])

      const timer = window.setTimeout(() => {
        setBursts((current) => current.filter((candidate) => candidate.id !== burst.id))
        timers.delete(timer)
      }, duration)
      timers.add(timer)
    }

    window.addEventListener("pointerdown", handlePointerDown, { passive: true })

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      for (const timer of timers) window.clearTimeout(timer)
      timers.clear()
    }
  }, [duration])

  return (
    <div data-effect="click-spark" data-click-spark data-effect-layer="pointer">
      {bursts.flatMap((burst) =>
        Array.from({ length: sparkCount }, (_, index) => {
          const angle = (Math.PI * 2 * index) / sparkCount
          const distance = sparkRadius

          return (
            <motion.span
              key={`${burst.id}-${index}`}
              className="fixed block origin-left rounded-full"
              style={{
                backgroundColor: sparkColor,
                left: burst.x,
                top: burst.y,
                width: sparkSize,
                height: 2,
              }}
              initial={{ opacity: 1, scaleX: 0.5, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                scaleX: 1,
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
              }}
              transition={{
                duration: duration / 1000,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          )
        }),
      )}
    </div>
  )
}
