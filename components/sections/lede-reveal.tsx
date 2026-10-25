"use client";

import { Fragment, useEffect, useRef } from "react";

import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";
import { ledeRevealProgress, wordRevealOpacity } from "@/lib/word-reveal";

/**
 * Scroll-linked word reveal for the About bio lede (run-3 iter 24).
 * The lede renders as word spans at full opacity until hydration, then
 * a rAF-throttled scroll listener ramps each word from the readable
 * floor to full opacity in reading order as the paragraph travels up
 * the viewport. No conditional render on the motion preference (that
 * would be an SSR/client hydration mismatch): under reduced motion the
 * effect never writes opacities and the CSS media query pins them at 1.
 */
export function LedeReveal({ text }: { readonly text: string }) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const words = text.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const spans = Array.from(
      el.querySelectorAll<HTMLElement>("[data-lede-word]"),
    );
    if (spans.length === 0) return;

    let raf = 0;
    let queued = false;
    const apply = () => {
      queued = false;
      const progress = ledeRevealProgress(
        el.getBoundingClientRect().top,
        window.innerHeight,
      );
      spans.forEach((span, index) => {
        const opacity = wordRevealOpacity(progress, index, spans.length);
        span.style.opacity = opacity >= 1 ? "" : opacity.toFixed(3);
      });
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        raf = requestAnimationFrame(apply);
      }
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      spans.forEach((span) => {
        span.style.opacity = "";
      });
    };
  }, []);

  return (
    <p ref={ref} className="journey-body journey-body--lede">
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          {index > 0 ? " " : null}
          <span data-lede-word>{word}</span>
        </Fragment>
      ))}
    </p>
  );
}
