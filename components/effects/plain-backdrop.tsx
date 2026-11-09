/**
 * /plain backdrop as a blueprint print (run-9 RUN9-ROUTES): the soft radial
 * glows become a static drafting sheet — blueprint grid, margin frame, and
 * registration marks. Pure CSS, zero JS, no animation by construction, so
 * it honors /plain's no-animations contract in both themes. The edition
 * marker lives in the page flow (plain-edition-strip), not here: a fixed
 * corner stamp collided with scrolling copy at phone width.
 */
export function PlainBackdrop() {
  return (
    <div aria-hidden="true" className="plain-backdrop" data-plain-backdrop>
      <span className="plain-backdrop-crop plain-backdrop-crop--tl">+</span>
      <span className="plain-backdrop-crop plain-backdrop-crop--tr">+</span>
      <span className="plain-backdrop-crop plain-backdrop-crop--bl">+</span>
      <span className="plain-backdrop-crop plain-backdrop-crop--br">+</span>
    </div>
  );
}
