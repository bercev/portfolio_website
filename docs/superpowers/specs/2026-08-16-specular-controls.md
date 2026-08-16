# Specular Control Highlight

## Understanding

- Add the supplied React Bits specular edge-light effect to native buttons and
  button-like links.
- Include the theme toggle, bubble-menu trigger, navigation bubbles, header and
  profile controls, project links, and research-paper hover-preview links.
- Preserve existing DOM semantics, refs, focus behavior, dimensions, colors,
  radii, and click handling.
- Keep Target Cursor and Click Spark unchanged.
- Preserve unrelated changes in the shared checkout.

## Assumptions

- `ogl` is the rendering dependency for the supplied shader.
- The effect is decorative and must never block control interaction.
- One shared WebGL context is sufficient for the current page and future
  controls that use the same opt-in selector.
- Reduced-motion, touch, and coarse-pointer profiles receive the existing
  static control treatment without a WebGL renderer.
- WebGL initialization failure leaves every control fully functional.

## Design

Adapt the React Bits fragment shader into an isolated client effect mounted by
`EffectStage`. One fixed, pointer-events-none canvas follows the active element
matching `button.cursor-target, a.cursor-target`. The renderer resizes to that
element's border box and uses its computed border radius, while theme tokens
provide a restrained cyan highlight and neutral base stroke.

Pointer movement steers and fades the highlight. The effect does not add
wrappers or replace interactive elements, so existing refs, GSAP navigation
motion, inline research-title flow, and accessibility behavior remain intact.
The existing effect profile mounts it only for fine-pointer desktop users.

The component owns and removes its pointer, scroll, resize, animation-frame,
and WebGL resources. Browser coverage verifies requested targets, research-paper
integration, unchanged Click Spark, and absence under reduced motion.

## Decision Log

- Chose one shared OGL renderer instead of one renderer per control to avoid
  browser WebGL context limits and redundant animation loops.
- Chose the existing `.cursor-target` convention narrowed to interactive
  buttons and links instead of adding a second class across the page.
- Chose the existing effect capability policy instead of independent media
  detection to preserve one accessibility source of truth.
- Chose an overlay instead of wrappers so navigation refs and inline research
  links keep their current layout and semantics.
