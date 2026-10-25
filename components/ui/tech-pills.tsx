import { normalizeTech, resolveSkillParam } from "@/lib/skill-work";
import { iconForTech } from "@/lib/tech-icons";

export function TechPills({
  technologies,
  marquee = false,
  linkedNames,
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
}) {
  const loop = marquee ? [...technologies, ...technologies] : technologies;

  return (
    <div className={marquee ? "tech-pills-marquee" : undefined}>
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
            >
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
  );
}
