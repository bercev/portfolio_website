"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { experience } from "@/data/content";

export function Experience() {
  const railRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ["start 0.8", "end 0.5"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section id="experience" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <h2>Experience</h2>
        </ScrollTextLines>

        <div ref={railRef} className="relative mt-12 pl-8">
          <div className="absolute left-2 top-0 h-full w-px bg-border" aria-hidden />
          <motion.div
            style={{ scaleY }}
            className="absolute left-2 top-0 h-full w-px origin-top bg-primary"
            aria-hidden
          />

          <ol className="space-y-12">
            {experience.map((role, i) => (
              <motion.li
                key={role.company + role.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                className="relative"
              >
                <span
                  className="absolute -left-8 top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background"
                  aria-hidden
                />
                <div className="rounded-2xl border bg-card p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold">
                      {role.title} ·{" "}
                      <span className="font-medium text-muted-foreground">{role.company}</span>
                    </h3>
                    <span className="text-sm text-muted-foreground">{role.period}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {role.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                    {role.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
