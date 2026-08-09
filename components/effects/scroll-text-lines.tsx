"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

function MaskedLine({
  children,
  progress,
  index,
}: {
  children: ReactNode;
  progress: MotionValue<number>;
  index: number;
}) {
  const x = useTransform(progress, [0, 1], [index % 2 === 0 ? -40 : 40, 0]);
  return (
    <span className="block overflow-hidden py-0.5">
      <motion.span style={{ x }} className="block will-change-transform">
        {children}
      </motion.span>
    </span>
  );
}

export function ScrollTextLines({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.6"],
  });
  const lines = (Array.isArray(children) ? children : [children]) as ReactNode[];

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <motion.span
          key={i}
          initial={reduced ? false : { opacity: 0, y: 40 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
          className="block"
        >
          <MaskedLine progress={scrollYProgress} index={i}>
            {line}
          </MaskedLine>
        </motion.span>
      ))}
    </div>
  );
}
