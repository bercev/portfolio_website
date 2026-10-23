/** Skip-to-content link (WCAG 2.4.1 Bypass Blocks, iter 40).
 * Visually hidden until keyboard focus; first in DOM order via layout.tsx,
 * so keyboard users land here before the fixed rail + FAB. Styled by
 * .skip-link in app/globals.css (the global :focus-visible ring applies). */
export function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}
