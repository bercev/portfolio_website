"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

type State = "idle" | "downloading" | "done";

export function ConfettiButton({
  label = "Download Resume",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const reduced = useReducedMotion();
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const fireConfetti = () => {
    if (reduced) return;
    const defaults = {
      zIndex: 200,
      spread: 80,
      ticks: 220,
      gravity: 0.9,
      startVelocity: 32,
      colors: ["#101723", "#636974", "#d7dfe5"],
    };
    confetti({ ...defaults, particleCount: 90, origin: { x: 0.5, y: 0.7 } });
    window.setTimeout(
      () => confetti({ ...defaults, particleCount: 60, angle: 60, origin: { x: 0.1, y: 0.8 } }),
      180
    );
    window.setTimeout(
      () => confetti({ ...defaults, particleCount: 60, angle: 120, origin: { x: 0.9, y: 0.8 } }),
      320
    );
  };

  const onDownload = () => {
    if (state !== "idle") return;
    setState("downloading");
    const a = document.createElement("a");
    a.href = "/resume.pdf";
    a.download = "Berat-Ercevik-Resume.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => {
      setState("done");
      fireConfetti();
      timer.current = window.setTimeout(() => setState("idle"), 2600);
    }, 900);
  };

  return (
    <motion.button
      type="button"
      onClick={onDownload}
      whileTap={{ scale: 0.96 }}
      aria-live="polite"
      className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-3 font-medium text-primary-foreground shadow-md transition-colors ${
        state === "done" ? "bg-emerald-600" : "bg-primary"
      } ${className ?? ""}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-2"
        >
          {state === "idle" && label}
          {state === "downloading" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
            </>
          )}
          {state === "done" && (
            <>
              <Check className="h-4 w-4" /> Resume downloaded!
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
