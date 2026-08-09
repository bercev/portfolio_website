"use client";

import { ArrowDown, FileDown, Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import { motion } from "motion/react";
import { ScrambleLines } from "@/components/effects/scramble-text";
import { Magnetic } from "@/components/effects/magnetic-button";
import { RadialMenu } from "@/components/effects/radial-menu";
import { LiquidBackground } from "@/components/effects/liquid-background";
import { identity } from "@/data/content";

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-transparent px-6"
    >
      <LiquidBackground />

      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.35em] text-muted-foreground">
          {identity.role}
        </p>
        <ScrambleLines
          lines={["Berat", "Ercevik"]}
          className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
        />
        <h2 className="mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {identity.tagline}
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
          {identity.bio}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <a
              href="#resume"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
            >
              <FileDown className="h-4 w-4" /> Download Resume
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href={identity.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border px-6 py-3 font-medium transition-colors hover:bg-accent"
            >
              <LinkedinIcon className="h-4 w-4" /> LinkedIn
            </a>
          </Magnetic>
        </div>

        <div className="mt-14 hidden md:block">
          <RadialMenu
            triggerLabel="Open social links"
            items={[
              { label: "GitHub", href: identity.github, icon: <GithubIcon className="h-5 w-5" /> },
              { label: "LinkedIn", href: identity.linkedin, icon: <LinkedinIcon className="h-5 w-5" /> },
              { label: "Vitae", href: identity.vitae, icon: <FileDown className="h-5 w-5" /> },
              { label: "Email", href: "#contact", icon: <Mail className="h-5 w-5" /> },
            ]}
          />
        </div>
      </div>

      <a
        href="#about"
        aria-label="Scroll to about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ArrowDown className="h-5 w-5" />
        </motion.div>
      </a>
    </section>
  );
}
