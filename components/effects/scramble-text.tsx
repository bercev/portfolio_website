"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

const CHARS = "!<>-_\\/[]{}—=+*^?#";

function useScramble(text: string, delay = 0) {
  const reduced = useReducedMotion();
  const [out, setOut] = useState("");

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const start = performance.now() + delay;

    const tick = (now: number) => {
      if (cancelled) return;
      if (reduced) {
        setOut(text);
        return;
      }
      const progress = Math.min(1, Math.max(0, (now - start) / (text.length * 28)));
      const reveal = Math.floor(progress * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        if (i < reveal) s += text[i];
        else if (text[i] === " ") s += " ";
        else s += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setOut(s);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setOut(text);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [text, delay, reduced]);

  return out;
}

export function ScrambleText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const value = useScramble(text, delay);
  return (
    <span className={className} aria-label={text}>
      {value}
    </span>
  );
}

export function ScrambleLines({
  lines,
  className,
  lineClassName,
  delay = 0,
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  delay?: number;
}) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={line} className={`block ${lineClassName ?? ""}`}>
          <ScrambleText text={line} delay={delay + i * 180} />
        </span>
      ))}
    </span>
  );
}
