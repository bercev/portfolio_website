import { ScrollTextLines } from "@/components/effects/scroll-text-lines";
import { publications } from "@/data/content";

export function Publications() {
  return (
    <section id="publications" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <ScrollTextLines className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <h2>Publications</h2>
        </ScrollTextLines>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {publications.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border bg-card p-5 transition-colors hover:bg-accent/40"
            >
              <h3 className="font-medium leading-snug">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.venue}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
