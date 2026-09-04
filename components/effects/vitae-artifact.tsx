"use client";

import { useTheme } from "next-themes";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { Project } from "@/data/content";
import { usePalette } from "@/components/providers/palette-provider";
import { ExternalLink } from "@/components/ui/external-link";
import {
  FINE_POINTER_QUERY,
  MOBILE_QUERY,
  REDUCED_MOTION_QUERY,
  getEffectProfile,
  type EffectProfile,
} from "@/lib/effect-policy";

import { VITAE_CASE, VITAE_TECH_LINGER_MS } from "./vitae-constants";
import { VitaeOrbitScene } from "./vitae-orbit-scene";

export { VITAE_TECH_LINGER_MS } from "./vitae-constants";

const STATIC_PROFILE: EffectProfile = {
  mode: "static",
  pointerEffects: false,
  particleCount: 0,
};

function readTokenColor(root: HTMLElement, token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  probe.style.display = "none";
  root.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return normalizeCssColor(color);
}

function normalizeCssColor(value: string): string {
  const srgb = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (!srgb) return value;
  const channel = (raw: string) => Math.round(parseFloat(raw) * 255);
  return `rgb(${channel(srgb[1])}, ${channel(srgb[2])}, ${channel(srgb[3])})`;
}

function VitaeCaseBody({ project }: { readonly project: Project }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-portfolio-accent">
          What it is
        </p>
        <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {VITAE_CASE.premise}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-portfolio-accent">
          Outcomes
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {VITAE_CASE.outcomes.map((outcome) => (
            <li key={outcome} className="vitae-outcome-chip">
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-portfolio-accent">
          Stack
        </p>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          {project.technologies.join(" · ")}
        </p>
      </div>

      {project.href ? (
        <p className="pt-2">
          <ExternalLink
            href={project.href}
            className="decoration-portfolio-accent text-base font-semibold"
          >
            Open vitae.tools
          </ExternalLink>
        </p>
      ) : null}
    </div>
  );
}

function VitaeLingerTags({
  technologies,
  visible,
}: {
  readonly technologies: readonly string[];
  readonly visible: boolean;
}) {
  if (technologies.length === 0) return null;

  return (
    <ul
      className="vitae-linger-tags"
      data-visible={visible ? "true" : "false"}
      aria-hidden={!visible}
    >
      {technologies.map((tech) => (
        <li key={tech} className="vitae-linger-tag">
          {tech}
        </li>
      ))}
    </ul>
  );
}

export function VitaeArtifact({ project }: { readonly project: Project }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef({ x: 0, y: 0, moved: false });
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneRef = useRef<VitaeOrbitScene | null>(null);
  const { resolvedTheme } = useTheme();
  const { palette } = usePalette();
  const [profile, setProfile] = useState<EffectProfile>(STATIC_PROFILE);
  const [inFocus, setInFocus] = useState(false);
  const [open, setOpen] = useState(false);
  const [lingerTags, setLingerTags] = useState(false);
  const titleId = useId();
  const enhanced = profile.mode === "enhanced";

  const clearLinger = useCallback(() => {
    if (lingerTimerRef.current !== null) {
      clearTimeout(lingerTimerRef.current);
      lingerTimerRef.current = null;
    }
    setLingerTags(false);
  }, []);

  const startLinger = useCallback(() => {
    if (lingerTimerRef.current !== null) {
      clearTimeout(lingerTimerRef.current);
    }
    lingerTimerRef.current = setTimeout(() => {
      lingerTimerRef.current = null;
      setLingerTags(true);
    }, VITAE_TECH_LINGER_MS);
  }, []);

  useEffect(() => {
    const finePointer = window.matchMedia(FINE_POINTER_QUERY);
    const mobile = window.matchMedia(MOBILE_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

    const updateProfile = () => {
      setProfile(
        getEffectProfile({
          finePointer: finePointer.matches,
          mobile: mobile.matches,
          reducedMotion: reducedMotion.matches,
        }),
      );
    };

    updateProfile();
    finePointer.addEventListener("change", updateProfile);
    mobile.addEventListener("change", updateProfile);
    reducedMotion.addEventListener("change", updateProfile);

    return () => {
      finePointer.removeEventListener("change", updateProfile);
      mobile.removeEventListener("change", updateProfile);
      reducedMotion.removeEventListener("change", updateProfile);
    };
  }, []);

  useEffect(() => {
    const projects = document.getElementById("projects");
    if (!projects) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInFocus(Boolean(entry?.isIntersecting)),
      { threshold: 0.35 },
    );
    observer.observe(projects);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enhanced || !canvas) return;

    let disposed = false;
    let scene: VitaeOrbitScene | null = null;
    const onResize = () => scene?.resize();

    const setup = async () => {
      try {
        await document.fonts.ready;
        if (disposed) return;
        scene = new VitaeOrbitScene({
          canvas,
          palette: {
            accent: readTokenColor(canvas, "--portfolio-accent"),
            cyan: readTokenColor(canvas, "--effect-chroma-cyan"),
            emerald: readTokenColor(canvas, "--effect-chroma-emerald"),
          },
        });
        scene.setPaused(!inFocus);
        sceneRef.current = scene;
        window.addEventListener("resize", onResize, { passive: true });
      } catch {
        scene?.dispose();
        scene = null;
        sceneRef.current = null;
      }
    };

    void setup();

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      scene?.dispose();
      if (sceneRef.current === scene) sceneRef.current = null;
    };
    // Theme/palette rebuild the scene; inFocus is applied in the pause effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhanced, palette, resolvedTheme]);

  useEffect(() => {
    sceneRef.current?.setPaused(!inFocus || open);
  }, [inFocus, open]);

  useEffect(() => {
    if (!open) return;
    if (lingerTimerRef.current !== null) {
      clearTimeout(lingerTimerRef.current);
      lingerTimerRef.current = null;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => () => clearLinger(), [clearLinger]);

  const openCase = useCallback(() => setOpen(true), []);
  const closeCase = useCallback(() => setOpen(false), []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    if (Math.hypot(dx, dy) > 6) dragRef.current.moved = true;
  };

  const onPointerUp = () => {
    if (!dragRef.current.moved) openCase();
  };

  return (
    <>
      <div
        data-vitae-artifact
        data-vitae-mode={enhanced ? "enhanced" : profile.mode}
        className="vitae-artifact"
      >
        {enhanced ? (
          <div
            role="button"
            tabIndex={0}
            className="vitae-orbit-hit cursor-target"
            data-vitae-hotspot
            aria-label="Open Vitae case study"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerEnter={startLinger}
            onPointerLeave={clearLinger}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openCase();
              }
            }}
          >
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className="vitae-orbit-canvas"
              data-vitae-orbit
            />
            <span className="vitae-orbit-hint">
              Grab to orbit · linger for tech · click for case
            </span>
            <VitaeLingerTags
              technologies={project.technologies}
              visible={lingerTags && !open}
            />
          </div>
        ) : (
          <button
            type="button"
            className="vitae-static-card cursor-target"
            data-vitae-hotspot
            aria-label="Open Vitae case study"
            onClick={openCase}
            onPointerEnter={startLinger}
            onPointerLeave={clearLinger}
          >
            <div className="vitae-static-stack" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-portfolio-accent">
              Versioned case card
            </p>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {VITAE_CASE.premise}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {VITAE_CASE.outcomes.map((outcome) => (
                <li key={outcome} className="vitae-outcome-chip">
                  {outcome}
                </li>
              ))}
            </ul>
            <VitaeLingerTags
              technologies={project.technologies}
              visible={lingerTags && !open}
            />
          </button>
        )}
      </div>

      {open ? (
        <div
          className="vitae-case-overlay"
          role="presentation"
          onClick={closeCase}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="vitae-case-panel liquid-glass"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-portfolio-accent">
                  Project deep-dive
                </p>
                <h3
                  id={titleId}
                  className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-foreground"
                >
                  {project.title}
                </h3>
                <p className="mt-2 text-sm font-semibold text-muted-foreground">
                  {project.dates}
                </p>
              </div>
              <button
                type="button"
                className="cursor-target rounded-full border border-border px-3 py-1 text-sm font-semibold text-foreground"
                onClick={closeCase}
              >
                Close
              </button>
            </div>
            <div className="mt-8">
              <VitaeCaseBody project={project} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
