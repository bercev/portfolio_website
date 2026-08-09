import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { ConfettiButton } from "@/components/effects/confetti-button";

export function ResumeSection() {
  return (
    <section id="resume" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <h2>Resume</h2>
          </ScrollTextLines>
          <ConfettiButton />
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border bg-card">
          <iframe
            src="/resume.pdf"
            title="Berat Ercevik — Resume"
            className="h-[70vh] w-full"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
