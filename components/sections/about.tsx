import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { education, identity, skills } from "@/data/content";

export function About() {
  const allSkills = Object.values(skills).flat();

  return (
    <section id="about" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <h2>About</h2>
        </ScrollTextLines>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{identity.bio}</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-medium">Education</h3>
            <p className="mt-2 font-semibold">{education.school}</p>
            <p className="text-sm text-muted-foreground">
              {education.degree} · GPA {education.gpa} · {education.period}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {education.coursework.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-medium">Snapshot</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>4.0 GPA — B.S. Computer Science, UC Santa Cruz</li>
              <li>100+ students tutored per quarter</li>
              <li>2 publications · ICML 2026 AIWILD + arXiv</li>
              <li>1M+ tweet dataset analyzed (Grok conversations)</li>
            </ul>
          </div>
        </div>

        <div className="mt-12">
          <h3 className="mb-4 font-medium">Skills</h3>
          <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="flex w-max animate-marquee gap-2">
              {[...allSkills, ...allSkills].map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="whitespace-nowrap rounded-full border px-4 py-1.5 text-sm"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
