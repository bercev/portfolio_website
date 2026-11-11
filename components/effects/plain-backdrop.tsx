/**
 * /plain backdrop as a still light field (run-10 RUN10-PLAIN): the
 * blueprint print is gone — no grid, no margin frame, no registration
 * marks. Soft static accent glows (pure CSS, zero JS, no animation by
 * construction) so it honors /plain's no-animations contract in both
 * themes. The corner marks are glow dots, the run-10 light language's
 * quietest marker. The edition marker lives in the page flow
 * (plain-edition-strip), not here: a fixed corner stamp collided with
 * scrolling copy at phone width.
 */
export function PlainBackdrop() {
  return (
    <div aria-hidden="true" className="plain-backdrop" data-plain-backdrop>
      <span className="plain-backdrop-dot plain-backdrop-dot--tl" />
      <span className="plain-backdrop-dot plain-backdrop-dot--tr" />
      <span className="plain-backdrop-dot plain-backdrop-dot--bl" />
      <span className="plain-backdrop-dot plain-backdrop-dot--br" />
    </div>
  );
}
