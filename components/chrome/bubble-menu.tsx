"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import type { PortfolioContent } from "@/data/content";

type BubbleMenuProps = {
  items: PortfolioContent["navigation"];
};

export function BubbleMenu({ items }: BubbleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[var(--z-site-navigation)] flex justify-center pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <motion.nav
        layout={reducedMotion ? false : true}
        aria-label="Section navigation"
        className="pointer-events-auto flex max-h-[min(70dvh,34rem)] max-w-full flex-col overflow-y-auto rounded-[var(--radius)] border border-border bg-popover/95 p-2 text-popover-foreground shadow-lg shadow-foreground/10 backdrop-blur-md"
        transition={{
          layout: reducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 360, damping: 32 },
        }}
      >
        <div className="order-2 flex justify-center">
          <button
            ref={triggerRef}
            type="button"
            aria-label="Open section navigation"
            aria-controls="section-navigation-links"
            aria-expanded={isOpen}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius)] bg-primary px-5 py-2 text-base font-medium text-primary-foreground transition-[background-color,color,transform] hover:bg-foreground hover:text-background active:scale-[0.98]"
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen ? (
              <XIcon className="size-5" weight="regular" aria-hidden="true" />
            ) : (
              <ListIcon
                className="size-5"
                weight="regular"
                aria-hidden="true"
              />
            )}
            Menu
          </button>
        </div>

        <div id="section-navigation-links" className="order-1">
          <AnimatePresence initial={false}>
            {isOpen ? (
              <motion.div
                key="navigation-items"
                className="grid w-[min(calc(100vw-3rem),52rem)] max-w-full grid-cols-1 gap-2 pb-2 md:grid-cols-4"
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
                }
              >
                {items.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius)] bg-secondary px-4 py-2 text-base text-secondary-foreground transition-[background-color,color,transform] hover:bg-accent hover:text-accent-foreground active:scale-[0.98]"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.nav>
    </div>
  );
}
