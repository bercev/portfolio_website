"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export type RadialItem = { label: string; href: string; icon: ReactNode };

const RADIUS = 92;

export function RadialMenu({
  items,
  className,
  triggerLabel,
}: {
  items: RadialItem[];
  className?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div className={`relative flex h-14 w-14 items-center justify-center ${className ?? ""}`}>
      <AnimatePresence>
        {open &&
          items.map((item, i) => {
            const angle = -90 + (i * 360) / items.length;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * RADIUS;
            const y = Math.sin(rad) * RADIUS;
            return (
              <motion.a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                aria-label={item.label}
                initial={reduced ? false : { opacity: 0, scale: 0, x, y }}
                animate={{ opacity: 1, scale: 1, x, y }}
                exit={{ opacity: 0, scale: 0, x, y }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.04 }}
                className="absolute left-1/2 top-1/2 -ml-[22px] -mt-[22px] flex h-11 w-11 items-center justify-center rounded-full border bg-background text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                {item.icon}
              </motion.a>
            );
          })}
      </AnimatePresence>
      <motion.button
        type="button"
        aria-expanded={open}
        aria-label={triggerLabel ?? "Open social links"}
        onClick={() => setOpen((v) => !v)}
        whileHover={reduced ? undefined : { scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
      >
        <span className={`transition-transform duration-300 ${open ? "rotate-45" : ""}`}>+</span>
      </motion.button>
    </div>
  );
}
