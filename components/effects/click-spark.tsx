"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type Burst = {
  id: number;
  x: number;
  y: number;
};

export function ClickSpark({
  sparkCount = 6,
  sparkSize = 7,
}: {
  sparkCount?: number;
  sparkSize?: number;
}) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);
  const cleanupTimers = useRef(new Set<number>());

  useEffect(() => {
    const timers = cleanupTimers.current;

    const handlePointerDown = (event: PointerEvent) => {
      const burst = {
        id: nextId.current,
        x: event.clientX,
        y: event.clientY,
      };
      nextId.current += 1;
      setBursts((current) => [...current, burst]);

      const timer = window.setTimeout(() => {
        setBursts((current) =>
          current.filter((candidate) => candidate.id !== burst.id),
        );
        timers.delete(timer);
      }, 520);
      timers.add(timer);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return (
    <div data-effect="click-spark" data-click-spark data-effect-layer="pointer">
      {bursts.flatMap((burst) =>
        Array.from({ length: sparkCount }, (_, index) => {
          const angle = (Math.PI * 2 * index) / sparkCount;
          const distance = sparkSize * 3.5;

          return (
            <motion.span
              key={`${burst.id}-${index}`}
              className="fixed block origin-left rounded-full bg-effect-spark"
              style={{
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
              transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
            />
          );
        }),
      )}
    </div>
  );
}
