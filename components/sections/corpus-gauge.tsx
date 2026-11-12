// Liquid-fill gauge for the @GrokSet corpus scale (RUN10-GAUGE).
// The vessel sits in the Algoverse experience row — the entry whose
// copy holds the verbatim "1M+ tweets" figure — and pours full on
// scroll-in: the corpus IS the gauge's whole capacity, so the level
// target is 100 and the pour overshoots and settles like a poured
// glass (Kokonut Liquid Gauge CD-09, MIT — the surface/level model
// lives in lib/corpus-gauge.ts, distilled from the reference source
// read in full; this file is only the render + loop + pointers).
//
// A sideways drag rocks the liquid (slosh); a pointer moving
// through the liquid stirs it. The level never moves under a drag —
// the figure stays verbatim. Bubbles rise while the level climbs
// and pop at the surface. Reduced motion: the glass renders full
// and flat from the first frame, no loop, no drag response — the
// same static contract as the rest of the site's RM surfaces.
// The loop pauses off-screen and in background tabs, like the
// reference.
"use client";

import { useInView } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CORPUS_GAUGE_BUBBLES,
  CORPUS_GAUGE_BUBBLE_RATE,
  CORPUS_GAUGE_FILL,
  CORPUS_GAUGE_FIGURE,
  CORPUS_GAUGE_HEADROOM_PX,
  CORPUS_GAUGE_LABEL,
  CORPUS_GAUGE_RIM,
  CORPUS_GAUGE_STEP,
  CORPUS_GAUGE_SUBLINE,
  corpusGaugeAdvanceBubbles,
  corpusGaugeDisturb,
  corpusGaugeFlatPolygon,
  corpusGaugeLevelY,
  corpusGaugeMaxHeight,
  corpusGaugeSettle,
  corpusGaugeSlosh,
  corpusGaugeSpawnBubble,
  corpusGaugeStep,
  corpusGaugeSurfacePolygon,
  createCorpusGaugeState,
} from "@/lib/corpus-gauge";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** The figure is one text node so it can never render spaceless
 * (the iter-32 word-gap trap): "1M+" and "tweets" share the span. */
export function CorpusGauge() {
  const rootRef = useRef<HTMLDivElement>(null);
  const liquidRef = useRef<HTMLDivElement>(null);
  const rimRef = useRef<HTMLDivElement>(null);
  const textInLiquidRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const reduceMotion = usePrefersReducedMotion();
  const inView = useInView(rootRef, { once: true, amount: 0.4 });
  // The pour starts on first scroll into view; the probe reads the
  // live level + surface so verification never guesses from frames.
  const [level, setLevel] = useState(0);
  const [surface, setSurface] = useState(0);

  const sim = useRef(createCorpusGaugeState());
  const sizeRef = useRef({ width: 0, height: 0 });
  const dragRef = useRef({ pointerId: -1, x: -1 });
  const loopRef = useRef({ raf: 0, last: 0, carry: 0, visible: true });

  const draw = useCallback(() => {
    const s = sim.current;
    const { width, height } = sizeRef.current;
    const liquid = liquidRef.current;
    const rim = rimRef.current;
    if (!liquid || !rim) return;
    if (!(width && height)) return;
    const levelY = corpusGaugeLevelY(
      s.level,
      height,
      CORPUS_GAUGE_HEADROOM_PX,
    );
    const surface = corpusGaugeSurfacePolygon(
      s.heights,
      levelY,
      width,
      height,
      0,
    );
    liquid.style.clipPath = surface;
    // The light copy of the figure rides the same surface polygon,
    // so it only shows where the liquid is.
    if (textInLiquidRef.current) {
      textInLiquidRef.current.style.clipPath = surface;
    }
    rim.style.clipPath = corpusGaugeSurfacePolygon(
      s.heights,
      levelY,
      width,
      height,
      CORPUS_GAUGE_RIM,
    );
    for (let i = 0; i < CORPUS_GAUGE_BUBBLES; i++) {
      const node = bubbleRefs.current[i];
      const bubble = s.bubbles[i];
      if (!node || !bubble) continue;
      if (!bubble.alive) {
        node.style.opacity = "0";
        continue;
      }
      const sway = Math.sin(s.time * 7 + bubble.phase) * 2.5;
      node.style.opacity = "1";
      node.style.transform = `translate3d(${(bubble.x * width + sway - bubble.r).toFixed(1)}px,${(bubble.y - bubble.r).toFixed(1)}px,0) scale(${(bubble.r / 4).toFixed(3)})`;
    }
  }, []);

  const tick = useCallback(
    (now: number) => {
      const s = sim.current;
      const loop = loopRef.current;
      loop.raf = 0;
      const elapsed = loop.last
        ? Math.min((now - loop.last) / 1000, 0.05)
        : CORPUS_GAUGE_STEP;
      loop.last = now;
      loop.carry += elapsed;
      let energy = 0;
      while (loop.carry >= CORPUS_GAUGE_STEP) {
        energy = Math.max(energy, corpusGaugeStep(s));
        loop.carry -= CORPUS_GAUGE_STEP;
      }
      // Only a climbing level makes bubbles, more the faster it climbs.
      s.spawn += Math.max(0, s.levelSpeed) * CORPUS_GAUGE_BUBBLE_RATE * elapsed;
      while (s.spawn >= 1) {
        s.spawn -= 1;
        if (
          !corpusGaugeSpawnBubble(
            s,
            0.12 + Math.random() * 0.76,
            sizeRef.current.height - 6,
            1.5 + Math.random() * 2.5,
            70 + Math.random() * 80,
            Math.random() * Math.PI * 2,
          )
        ) {
          s.spawn = 0;
          break;
        }
      }
      const bubbles = corpusGaugeAdvanceBubbles(
        s,
        sizeRef.current.height,
        elapsed,
        CORPUS_GAUGE_HEADROOM_PX,
      );
      draw();
      setLevel(Math.round(s.level));
      setSurface(Math.round(corpusGaugeMaxHeight(s) * 10) / 10);
      const busy =
        dragRef.current.pointerId >= 0 || bubbles > 0 || energy > 0.02;
      if (busy && loop.visible) {
        loop.raf = requestAnimationFrame(tick);
      } else {
        loop.last = 0;
        if (!busy) {
          corpusGaugeSettle(s);
          draw();
          setLevel(Math.round(s.level));
          setSurface(0);
        }
      }
    },
    [draw],
  );

  const wake = useCallback(() => {
    const loop = loopRef.current;
    if (!loop.raf && loop.visible) loop.raf = requestAnimationFrame(tick);
  }, [tick]);

  // Scroll-in pours the gauge: target 0 → 100 once, never again.
  // Under reduced motion the glass is full from the first frame.
  useEffect(() => {
    const s = sim.current;
    if (!inView) return;
    s.target = CORPUS_GAUGE_FILL;
    if (reduceMotion) {
      corpusGaugeSettle(s);
      setLevel(CORPUS_GAUGE_FILL);
      setSurface(0);
      // The RM render is drawn by the flat-polygon branch below;
      // still paint once so a mid-mount probe reads the flat fill.
      const flat = corpusGaugeFlatPolygon(
        CORPUS_GAUGE_FILL,
        0,
        CORPUS_GAUGE_HEADROOM_PX,
      );
      const liquid = liquidRef.current;
      const rim = rimRef.current;
      if (liquid) liquid.style.clipPath = flat;
      if (rim) {
        rim.style.clipPath = corpusGaugeFlatPolygon(
          CORPUS_GAUGE_FILL,
          CORPUS_GAUGE_RIM,
          CORPUS_GAUGE_HEADROOM_PX,
        );
      }
      if (textInLiquidRef.current) {
        textInLiquidRef.current.style.clipPath = flat;
      }
      return;
    }
    wake();
  }, [inView, reduceMotion, wake]);

  // Sizing, visibility, and reduced-motion changes — the loop waits
  // off-screen and in background tabs (Kokonut's pause contract).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const resize = new ResizeObserver(([entry]) => {
      sizeRef.current = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      // A resize mid-pour must not freeze the surface mid-wave.
      if (reduceMotion) {
        const flat = corpusGaugeFlatPolygon(
          CORPUS_GAUGE_FILL,
          0,
          CORPUS_GAUGE_HEADROOM_PX,
        );
        const liquid = liquidRef.current;
        const rim = rimRef.current;
        if (liquid) liquid.style.clipPath = flat;
        if (rim) {
          rim.style.clipPath = corpusGaugeFlatPolygon(
            CORPUS_GAUGE_FILL,
            CORPUS_GAUGE_RIM,
            CORPUS_GAUGE_HEADROOM_PX,
          );
        }
        if (textInLiquidRef.current) {
          textInLiquidRef.current.style.clipPath = flat;
        }
      } else {
        draw();
      }
    });
    resize.observe(root);
    let onScreen = true;
    const loop = loopRef.current;
    const pause = () => {
      if (!loop.visible && loop.raf) {
        cancelAnimationFrame(loop.raf);
        loop.raf = 0;
        loop.last = 0;
      } else if (loop.visible) {
        wake();
      }
    };
    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      loop.visible = onScreen && !document.hidden;
      pause();
    });
    intersection.observe(root);
    const onVisibility = () => {
      loop.visible = onScreen && !document.hidden;
      pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(loop.raf);
      loop.raf = 0;
    };
  }, [draw, reduceMotion, wake]);

  const disturb = useCallback(
    (clientX: number, amount: number, reach = 3) => {
      const s = sim.current;
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect || reduceMotion) return;
      const xFrac = (clientX - rect.left) / rect.width;
      corpusGaugeDisturb(s, xFrac, amount, reach);
    },
    [reduceMotion],
  );

  const handlePointerDown = (event: React.PointerEvent) => {
    if (reduceMotion) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const drag = dragRef.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.pointerId = event.pointerId;
    drag.x = event.clientX;
    // The press itself lands like a drop.
    disturb(event.clientX, 260, 2.5);
    wake();
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    const dx = drag.x < 0 ? 0 : event.clientX - drag.x;
    drag.x = event.clientX;
    if (reduceMotion) return;
    if (drag.pointerId === event.pointerId) {
      // A sideways drag rocks the whole body — the level never moves.
      corpusGaugeSlosh(sim.current, dx);
      wake();
      return;
    }
    // Hovering through the liquid stirs it, behind the cursor.
    const rect = rootRef.current?.getBoundingClientRect();
    if (event.pointerType !== "mouse" || !rect || dx === 0) return;
    const levelY = corpusGaugeLevelY(
      sim.current.level,
      rect.height,
      CORPUS_GAUGE_HEADROOM_PX,
    );
    if (event.clientY - rect.top > levelY + 8) {
      disturb(event.clientX, Math.abs(dx) * 20, 2);
      wake();
    }
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    drag.pointerId = -1;
    drag.x = -1;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(6);
    }
    wake();
  };

  const handlePointerLeave = () => {
    if (dragRef.current.pointerId < 0) dragRef.current.x = -1;
  };

  // Both text copies are aria-hidden — the figure's accessible name
  // lives on the root's role="img" label. See the JSX for the
  // dark-copy / light-copy layering.
  return (
    <figure
      className="corpus-gauge"
      role="img"
      aria-label={`Liquid gauge: ${CORPUS_GAUGE_FIGURE} of ${CORPUS_GAUGE_SUBLINE} in the ${CORPUS_GAUGE_LABEL}`}
    >
      <figcaption className="corpus-gauge-label" aria-hidden="true">
        <span className="corpus-gauge-label-dot" />
        {CORPUS_GAUGE_LABEL}
      </figcaption>
      <div
        ref={rootRef}
        className="corpus-gauge-vessel"
        data-corpus-gauge
        data-gauge-level={level}
        data-gauge-surface={surface}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {/* Ticks every ten percent on the right wall. */}
        <div className="corpus-gauge-ticks" aria-hidden="true">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((tick) => (
            <span key={tick} style={{ bottom: `${tick}%` }} />
          ))}
        </div>
        {/* The figure text rides twice, like Kokonut's GaugeText: the
            dark copy sits UNDER the liquid and the light copy rides
            above it, clipped to the same surface polygon — so the
            figure stays legible while the glass pours past it. DOM
            order is the stacking order here. */}
        <div className="corpus-gauge-text" aria-hidden="true">
          <span className="corpus-gauge-figure">{CORPUS_GAUGE_FIGURE}</span>
          <span className="corpus-gauge-subline">{CORPUS_GAUGE_SUBLINE}</span>
        </div>
        {/* The meniscus: a lighter band riding just above the surface. */}
        <div ref={rimRef} className="corpus-gauge-rim" aria-hidden="true" />
        {/* The liquid, clipped to the live surface. */}
        <div
          ref={liquidRef}
          className="corpus-gauge-liquid"
          aria-hidden="true"
        />
        {/* Bubbles rise while the level climbs. */}
        {Array.from({ length: CORPUS_GAUGE_BUBBLES }, (_, i) => (
          <span
            key={i}
            ref={(node) => {
              bubbleRefs.current[i] = node;
            }}
            className="corpus-gauge-bubble"
            aria-hidden="true"
          />
        ))}
        <div
          ref={textInLiquidRef}
          className="corpus-gauge-text corpus-gauge-text--in-liquid"
          aria-hidden="true"
        >
          <span className="corpus-gauge-figure">{CORPUS_GAUGE_FIGURE}</span>
          <span className="corpus-gauge-subline">{CORPUS_GAUGE_SUBLINE}</span>
        </div>
      </div>
    </figure>
  );
}
