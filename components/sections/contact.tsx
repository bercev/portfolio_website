import { FileDown } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { identity } from "@/data/content";

export function Contact() {
  const socials = [
    { label: "GitHub", href: identity.github, icon: <GithubIcon className="h-5 w-5" /> },
    { label: "LinkedIn", href: identity.linkedin, icon: <LinkedinIcon className="h-5 w-5" /> },
    { label: "Vitae", href: identity.vitae, icon: <FileDown className="h-5 w-5" /> },
  ];

  return (
    <footer id="contact" className="bg-background px-6 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <h2>Let’s connect</h2>
        </ScrollTextLines>
        <p className="mt-4 text-muted-foreground">
          I’m always up for a conversation about engineering, AI, or great teams.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              className="flex h-11 w-11 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-accent"
            >
              {s.icon}
            </a>
          ))}
          <a
            href="#resume"
            aria-label="Download resume"
            className="flex h-11 w-11 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-accent"
          >
            <FileDown className="h-5 w-5" />
          </a>
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          © 2026 Berat Ercevik. Built with Next.js, Tailwind, and Motion.
        </p>
      </div>
    </footer>
  );
}
