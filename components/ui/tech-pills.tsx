import { normalizeTech, resolveSkillParam } from "@/lib/skill-work";
import { iconForTech } from "@/lib/tech-icons";

/** Part number for the measuring-tape treatment (run-9 iter 23,
    RUN9-EXP-TAPE): EX-01…, wrapping at the tech count so the duplicated
    loop copy shares the original's rhythm (same wrap as the skill tape's
    skillTapeStaggerIndex). */
export function expTapePartLabel(index: number, count: number): string {
  const n = count > 0 ? (index % count) + 1 : 1;
  return `EX-${String(n).padStart(2, "0")}`;
}

/** Pop delay in seconds: 0.1s lead, then 30ms per part (the run-8
    stagger, same as the skill tape). */
export function expTapePopDelay(index: number, count: number): number {
  return 0.1 + (count > 0 ? index % count : 0) * 0.03;
}

export function TechPills({
  technologies,
  marquee = false,
  linkedNames,
  tape = false,
  tapeEntered = false,
}: {
  readonly technologies: readonly string[];
  readonly marquee?: boolean;
  /**
   * Ledger skill names (run-3 iter 23, reverse navigation): when
   * provided, a pill resolving to one of these names gets the linked
   * affordance. Marquee rows never pass this — a moving click target
   * is worse than none — so marquee pills stay static labels.
   */
  readonly linkedNames?: readonly string[];
  /**
   * Measuring-tape treatment (run-9 iter 23, RUN9-EXP-TAPE): the
   * featured-row marquee becomes the drawing set's steel tape —
   * bordered strip, tick rules, mono legend, EX- part numerals.
   * Only meaningful with marquee.
   */
  readonly tape?: boolean;
  /** Latched once the row first enters view — drives the tape entry. */
  readonly tapeEntered?: boolean;
}) {
  const loop = marquee ? [...technologies, ...technologies] : technologies;

  return (
    <>
      {tape && marquee ? (
        <p className="exp-tape-legend" aria-hidden="true">
          STACK — TAPE 01
        </p>
      ) : null}
      <div
        className={
          marquee
            ? `tech-pills-marquee${tape ? " exp-tape" : ""}${tape && tapeEntered ? " exp-tape--in" : ""}`
            : undefined
        }
      >
        <ul className="tech-pills" aria-label="Stack">
          {loop.map((technology, index) => {
            const icon = iconForTech(technology);
            const linked =
              linkedNames !== undefined &&
              resolveSkillParam(normalizeTech(technology), linkedNames) !==
                null;
            return (
              <li
                key={`${technology}-${index}`}
                className={linked ? "tech-pill tech-pill-linked" : "tech-pill"}
                data-tech={normalizeTech(technology)}
                aria-hidden={
                  marquee && index >= technologies.length ? true : undefined
                }
                style={
                  tape
                    ? { animationDelay: `${expTapePopDelay(index, technologies.length)}s` }
                    : undefined
                }
              >
                {tape ? (
                  <span className="exp-tape-num" aria-hidden="true">
                    {expTapePartLabel(index, technologies.length)}
                  </span>
                ) : null}
                {icon ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="tech-pill-icon"
                  >
                    <path fill="currentColor" d={icon.path} />
                  </svg>
                ) : null}
                <span>{technology}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
