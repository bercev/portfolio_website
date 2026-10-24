/**
 * Journey epilogue (run-2 iter 49). The scroll journey previously ended
 * dead at the contact station: nothing after it, and the only `#home`
 * link in the tree lived in dead-code site-header.tsx. This is the
 * loop-back beat — a small static ASCII mark, one sign-off line, and a
 * plain `#home` anchor — mounted BELOW the whole contact station in
 * PortfolioMain, never above the form's transmit button.
 *
 * Static by design: no client JS, no animation, so the reduced-motion
 * poster is byte-identical to the full-motion frame, and the return
 * trip needs no reverse-animation work — every scroll system on the
 * site is position-driven and exactly reversible.
 */
export function JourneyEpilogue() {
  return (
    <footer
      data-journey-epilogue
      aria-label="End of the journey"
      className="journey-epilogue"
    >
      <p aria-hidden="true" className="journey-epilogue-mark">
        ░▒▓ BERAT ▓▒░
      </p>
      <p className="journey-epilogue-line">
        End of the journey — thanks for reading to the bottom.
      </p>
      <a href="#home" className="journey-epilogue-top">
        Back to top ↑
      </a>
    </footer>
  );
}
