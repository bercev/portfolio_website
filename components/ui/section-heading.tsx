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
      <h2 className="font-serif text-4xl leading-[0.95] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl">
        <WarpText text={title} />
      </h2>
      {description ? (
        <p className="mt-5 max-w-[62ch] text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
