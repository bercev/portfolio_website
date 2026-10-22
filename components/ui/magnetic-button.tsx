"use client";

import React, { useRef, useState } from "react";
import { motion } from "motion/react";

/**
 * Pre-built component from Aceternity UI (https://ui.aceternity.com/components/magnetic-button),
 * ported VERBATIM except for the registry-demo playground chrome: the upstream snippet wraps the
 * button in a dashed-border/highlight box that visualizes the magnetic field on hover (its docs
 * demo affordance). On this site that reads as slop, so the wrapper is a neutral inline-block;
 * the tracking + spring-return mechanism below is unchanged. `motion` was already a dependency
 * (no new package installed — security gate N/A).
 */
export const MagneticButton = ({
  children,
  strength = 0.8,
  maxDistance = 100,
}: {
  children: React.ReactNode;
  strength?: number;
  maxDistance?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const { width, height, left, top } = ref.current.getBoundingClientRect();
    const { clientX, clientY } = e;

    let x = (clientX - (left + width / 2)) * strength;
    let y = (clientY - (top + height / 2)) * strength;

    const distance = Math.hypot(x, y);
    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      x *= scale;
      y *= scale;
    }

    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="inline-block">
      <motion.div
        ref={ref}
        animate={{ x: position.x, y: position.y }}
        transition={{ type: "spring", stiffness: 150, damping: 25, mass: 0.1 }}
      >
        {children}
      </motion.div>
    </div>
  );
};
