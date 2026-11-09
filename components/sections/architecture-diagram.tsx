/**
 * Living architecture diagrams for the expanded case-study panels
 * (run-9 RUN9-ARCH-SCHEMATIC-LIVE).
 *
 * Library decision (per loop rules): no maintained component catalog offers
 * an honest custom system diagram — Aceternity's Animated Beam is beam FX
 * (gimmick risk against the one-signature rule), and React Bits / Magic UI
 * have no diagram primitive either. A hand-drawn SVG of the site's actual
 * systems is the right call here.
 *
 * Each diagram must PROVE in one glance what the prose can't: the system's
 * shape (dev.to "What Have You Actually Done?" + sourcely visual-storytelling
 * scope notes). The diagrams are no longer calm static SVGs: on first view
 * (panel open + scrolled into view) each diagram assembles in data-flow
 * order — nodes light in sequence, connector arrows draw in with
 * pathLength, arrowheads land as the stroke arrives, and the chatbot's
 * return arrow to Discord lands last as the payoff. The settled state is
 * the old static diagram verbatim (same coordinates, same strokes, same
 * copy); only the reveal animates. The panel prose already says everything
 * twice, so the SVG is role="img" with a one-line summary title.
 *
 * Reduced motion renders everything settled from the first frame via the
 * native hook (motion's useReducedMotion() is unreliable in this app,
 * run-9 iter 1) — durations go to 0 under RM. Print settles via the
 * @media print rule in globals.css (the global print opacity:1 rule
 * covers the fades; the arch rule resets the draw dasharray).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef, type ComponentType } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  ARCH_FLOW_DURATION_S,
  ARCH_LABEL_DURATION_S,
  ARCH_MARKER_DURATION_S,
  ARCH_NODE_DURATION_S,
  ARCH_RETURN_DURATION_S,
  archMarkerDelay,
  archStepDelay,
  CHATBOT_ARCH_STEPS,
  VITAE_ARCH_STEPS,
} from "@/lib/arch-schematic";
import type { Project } from "@/data/content";

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type ArchMotion = {
  /** True once the diagram has been seen (or always, under RM). */
  readonly entered: boolean;
  readonly reduceMotion: boolean;
};

/** First-view trigger, shared by both diagrams: once, -60px margin, in
 *  the press-and-draw family's language. */
function useArchSchematic() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = usePrefersReducedMotion();
  return { ref, entered: inView || reduceMotion, reduceMotion };
}

function StageBox({
  x,
  y,
  w,
  title,
  sub,
}: {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly title: string;
  readonly sub: string;
}) {
  const h = 58;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className="journey-arch-box" />
      <text x={x + w / 2} y={y + 27} className="journey-arch-label">
        {title}
      </text>
      <text x={x + w / 2} y={y + 45} className="journey-arch-sub">
        {sub}
      </text>
    </g>
  );
}

/** One node lighting in — the box, its title, and its sub all fade as a
 *  unit, so the text never floats ahead of its frame. */
function StageNode({
  x,
  y,
  w,
  title,
  sub,
  name,
  delay,
  entered,
  reduceMotion,
}: {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly title: string;
  readonly sub: string;
  readonly name: string;
  readonly delay: number;
  readonly entered: boolean;
  readonly reduceMotion: boolean;
}) {
  return (
    <motion.g
      data-arch-node={name}
      initial={{ opacity: 0 }}
      animate={entered ? { opacity: 1 } : {}}
      transition={{
        duration: reduceMotion ? 0 : ARCH_NODE_DURATION_S,
        delay: reduceMotion ? 0 : delay,
        ease: SITE_EASE,
      }}
    >
      <StageBox x={x} y={y} w={w} title={title} sub={sub} />
    </motion.g>
  );
}

/**
 * One arrowhead, as its own marker def per flow — the head's opacity is
 * keyed to its own line's landing, so a head never floats at a
 * destination whose line hasn't arrived yet (a shared def would light
 * every head on the first line's schedule).
 */
function FlowMarker({
  id,
  name,
  delay,
  entered,
  reduceMotion,
}: {
  readonly id: string;
  readonly name: string;
  readonly delay: number;
  readonly entered: boolean;
  readonly reduceMotion: boolean;
}) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto"
      >
        <motion.path
          d="M0,0 L10,5 L0,10 z"
          className="journey-arch-head"
          data-arch-head={name}
          initial={{ opacity: 0 }}
          animate={entered ? { opacity: 1 } : {}}
          transition={{
            duration: reduceMotion ? 0 : ARCH_MARKER_DURATION_S,
            delay: reduceMotion ? 0 : delay,
            ease: SITE_EASE,
          }}
        />
      </marker>
    </defs>
  );
}

type FlowProps = ArchMotion & {
  readonly markerId: string;
  readonly name: string;
  readonly delay: number;
  readonly duration: number;
};

/** A straight connector drawing in, head landing with the stroke. */
function FlowLine({
  x1,
  y1,
  x2,
  y2,
  markerId,
  name,
  delay,
  duration,
  entered,
  reduceMotion,
}: FlowProps & {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}) {
  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className="journey-arch-flow"
      data-arch-flow={name}
      markerEnd={`url(#${markerId})`}
      pathLength={1}
      initial={{ pathLength: 0 }}
      animate={entered ? { pathLength: 1 } : {}}
      transition={{
        duration: reduceMotion ? 0 : duration,
        delay: reduceMotion ? 0 : delay,
        ease: SITE_EASE,
      }}
    />
  );
}

/** Vitae: editor → block-level merge engine → Postgres; Clerk for auth,
 *  GitHub Actions → Netlify deploys on every merge. */
function VitaeDiagram() {
  const { ref, entered, reduceMotion } = useArchSchematic();
  const steps = VITAE_ARCH_STEPS;
  const cx = 190;
  return (
    <svg
      ref={ref}
      viewBox="0 0 380 312"
      className="journey-arch"
      role="img"
      aria-label="Vitae architecture: resume editor, block-level merge engine, and Postgres storage, with Clerk for auth and GitHub Actions to Netlify deploys."
    >
      <title>Vitae system diagram</title>
      <StageNode
        x={100}
        y={4}
        w={180}
        title="Resume editor"
        sub="Next.js · React"
        name="editor"
        delay={archStepDelay(steps, 0)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <FlowMarker
        id="journey-arch-arrow-vitae-1"
        name="flow-1"
        delay={archMarkerDelay(steps, 1)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <FlowLine
        x1={cx}
        y1={62}
        x2={cx}
        y2={86}
        markerId="journey-arch-arrow-vitae-1"
        name="flow-1"
        delay={archStepDelay(steps, 1)}
        duration={ARCH_FLOW_DURATION_S}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <StageNode
        x={100}
        y={92}
        w={180}
        title="Merge engine"
        sub="branch · diff · block-level merge"
        name="merge"
        delay={archStepDelay(steps, 2)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <FlowMarker
        id="journey-arch-arrow-vitae-2"
        name="flow-2"
        delay={archMarkerDelay(steps, 3)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <FlowLine
        x1={cx}
        y1={150}
        x2={cx}
        y2={174}
        markerId="journey-arch-arrow-vitae-2"
        name="flow-2"
        delay={archStepDelay(steps, 3)}
        duration={ARCH_FLOW_DURATION_S}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <StageNode
        x={100}
        y={180}
        w={180}
        title="Postgres"
        sub="Neon in prod · Docker locally"
        name="postgres"
        delay={archStepDelay(steps, 4)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      {/* Supporting systems — no flow arrows, they enable the pipeline,
          so they light in together as the last step. */}
      <motion.g
        data-arch-node="support"
        initial={{ opacity: 0 }}
        animate={entered ? { opacity: 1 } : {}}
        transition={{
          duration: reduceMotion ? 0 : ARCH_NODE_DURATION_S,
          delay: reduceMotion ? 0 : archStepDelay(steps, 5),
          ease: SITE_EASE,
        }}
      >
        <StageBox x={4} y={244} w={182} title="Clerk" sub="auth, not bespoke identity" />
        <StageBox x={194} y={244} w={182} title="CI/CD" sub="GitHub Actions → Netlify" />
      </motion.g>
    </svg>
  );
}

/** Chatbot: the grounding loop — a Discord question is answered from the
 *  indexed community history, not the base model. The return arrow is the
 *  point of the whole project. */
function ChatbotDiagram() {
  const { ref, entered, reduceMotion } = useArchSchematic();
  const steps = CHATBOT_ARCH_STEPS;
  const cx = 150;
  return (
    <svg
      ref={ref}
      viewBox="0 0 380 324"
      className="journey-arch"
      role="img"
      aria-label="Chatbot architecture: a Discord question is indexed and retrieved from 10K+ community messages, answered by Llama 3 running locally in Ollama, checked by a self-correction pass, and returned to Discord as a grounded answer."
    >
      <title>Chatbot system diagram</title>
      <StageNode
        x={60}
        y={4}
        w={180}
        title="Discord question"
        sub="from a community member"
        name="discord"
        delay={archStepDelay(steps, 0)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <FlowMarker
        id="journey-arch-arrow-chatbot-1"
        name="flow-1"
        delay={archMarkerDelay(steps, 1)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <FlowLine
        x1={cx}
        y1={62}
        x2={cx}
        y2={82}
        markerId="journey-arch-arrow-chatbot-1"
        name="flow-1"
        delay={archStepDelay(steps, 1)}
        duration={ARCH_FLOW_DURATION_S}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <StageNode
        x={60}
        y={88}
        w={180}
        title="Index + retrieve"
        sub="10K+ messages · LangChain"
        name="index"
        delay={archStepDelay(steps, 2)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <FlowMarker
        id="journey-arch-arrow-chatbot-2"
        name="flow-2"
        delay={archMarkerDelay(steps, 3)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <FlowLine
        x1={cx}
        y1={146}
        x2={cx}
        y2={166}
        markerId="journey-arch-arrow-chatbot-2"
        name="flow-2"
        delay={archStepDelay(steps, 3)}
        duration={ARCH_FLOW_DURATION_S}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <StageNode
        x={60}
        y={172}
        w={180}
        title="Ollama"
        sub="Llama 3 · local inference"
        name="ollama"
        delay={archStepDelay(steps, 4)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <FlowMarker
        id="journey-arch-arrow-chatbot-3"
        name="flow-3"
        delay={archMarkerDelay(steps, 5)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <FlowLine
        x1={cx}
        y1={230}
        x2={cx}
        y2={250}
        markerId="journey-arch-arrow-chatbot-3"
        name="flow-3"
        delay={archStepDelay(steps, 5)}
        duration={ARCH_FLOW_DURATION_S}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <StageNode
        x={60}
        y={256}
        w={180}
        title="Self-correction"
        sub="checked against the history"
        name="correction"
        delay={archStepDelay(steps, 6)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      {/* The grounding return: a square-cornered path back up to Discord.
          It draws slowest and lands last — the payoff. */}
      <FlowMarker
        id="journey-arch-arrow-chatbot-return"
        name="return"
        delay={archMarkerDelay(steps, 7)}
        entered={entered}
        reduceMotion={reduceMotion}
      />
      <motion.path
        d="M 240 284 H 322 V 32 H 240"
        className="journey-arch-flow"
        data-arch-flow="return"
        markerEnd="url(#journey-arch-arrow-chatbot-return)"
        pathLength={1}
        initial={{ pathLength: 0 }}
        animate={entered ? { pathLength: 1 } : {}}
        transition={{
          duration: reduceMotion ? 0 : ARCH_RETURN_DURATION_S,
          delay: reduceMotion ? 0 : archStepDelay(steps, 7),
          ease: SITE_EASE,
        }}
      />
      <motion.text
        x={281}
        y={24}
        className="journey-arch-sub"
        data-arch-label="grounded"
        initial={{ opacity: 0 }}
        animate={entered ? { opacity: 1 } : {}}
        transition={{
          duration: reduceMotion ? 0 : ARCH_LABEL_DURATION_S,
          delay: reduceMotion ? 0 : archStepDelay(steps, 8),
          ease: SITE_EASE,
        }}
      >
        grounded answer
      </motion.text>
    </svg>
  );
}

const projectDiagrams: Partial<Record<Project["title"], ComponentType>> = {
  Vitae: VitaeDiagram,
  "AI Discord Chatbot": ChatbotDiagram,
};

export function ArchitectureDiagram({
  title,
}: {
  readonly title: Project["title"];
}) {
  const Diagram = projectDiagrams[title];
  if (!Diagram) return null;
  return <Diagram />;
}

export function hasArchitectureDiagram(title: Project["title"]): boolean {
  return title in projectDiagrams;
}
