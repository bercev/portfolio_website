import { ArrowUpRight } from "lucide-react";
import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { GlowCard } from "@/components/effects/glow-card";
import { projects } from "@/data/content";

export function Projects() {
  return (
    <section id="projects" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <h2>Projects</h2>
        </ScrollTextLines>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {projects.map((p) => (
            <GlowCard key={p.name} className="h-full">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <span className="text-xs text-muted-foreground">{p.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {p.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
              {p.link && (
                <a
                  href={p.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                >
                  {p.linkLabel ?? p.link} <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
