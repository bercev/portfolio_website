import { WarpText } from "@/components/effects/warp-text";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <h2 className="max-w-[11ch] font-serif text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
        <WarpText text={title} />
      </h2>
      {description ? (
        <p className="mt-5 ml-[clamp(0px,3vw,2rem)] max-w-[52ch] font-mono text-sm font-semibold leading-7 text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
