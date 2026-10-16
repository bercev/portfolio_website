import type { SectionId } from "@/data/content";
import { BUILD_LOGS, BUILD_LOG_LIVE_PROMPT } from "@/data/story";
import { cn } from "@/lib/utils";

type StationProps = {
  readonly id: SectionId;
  /** Numbered chapter on the journey, e.g. 2 for the About chapter. */
  readonly station: number;
  readonly heading: string;
  /** Scannable fact pinned to the right edge of the masthead rule. */
  readonly note?: string;
  readonly className?: string;
  readonly children: React.ReactNode;
};

export function Station({
  id,
  station,
  heading,
  note,
  className,
  children,
}: StationProps) {
  return (
    <section
      id={id}
      data-journey-station
      aria-labelledby={`${id}-heading`}
      className={cn(
        "relative scroll-mt-[calc(4rem+env(safe-area-inset-top))]",
        className,
      )}
    >
      <header className="journey-station-head">
        <p className="journey-kicker">{station}</p>
        {note ? <p className="journey-station-note">{note}</p> : null}
        <h2 id={`${id}-heading`} className="journey-station-heading">
          {heading}
        </h2>
        {BUILD_LOGS[id]?.length ? (
          <p className="journey-build-log" aria-hidden="true">
            {BUILD_LOGS[id].map((line) => (
              <span key={line} className="journey-build-log-line">
                <span className="journey-build-log-prompt">$</span> {line}
              </span>
            ))}
            {BUILD_LOG_LIVE_PROMPT.has(id) ? (
              <span className="journey-build-log-cursor" />
            ) : null}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
