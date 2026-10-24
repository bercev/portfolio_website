/**
 * Pure math for the Aceternity Chromatic Image mechanism (copy-and-own):
 * pointer-driven RGB channel separation + perspective tilt over a
 * cover-cropped image, rendered by a native WebGL shader (no scene lib).
 *
 * Kept dependency-free and unit-tested here so the component file only
 * owns GL plumbing. Texture space: v runs bottom-to-top (UNPACK_FLIP_Y).
 */

export type CoverTransform = {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly offsetX: number;
  readonly offsetY: number;
};

/**
 * Cover-crop mapping from quad UV [0,1] to texture UV: texUV = uv * scale
 * + offset. A canvas wider than the image crops top/bottom (scaleY < 1);
 * a taller canvas crops left/right (scaleX < 1). Degenerate sizes map to
 * identity rather than NaN.
 */
export function coverTransform(
  canvasW: number,
  canvasH: number,
  imgW: number,
  imgH: number,
): CoverTransform {
  if (!(canvasW > 0 && canvasH > 0 && imgW > 0 && imgH > 0)) {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  }
  const canvasAspect = canvasW / canvasH;
  const imgAspect = imgW / imgH;
  if (canvasAspect > imgAspect) {
    const scaleY = imgAspect / canvasAspect;
    return { scaleX: 1, scaleY, offsetX: 0, offsetY: (1 - scaleY) / 2 };
  }
  const scaleX = canvasAspect / imgAspect;
  return { scaleX, scaleY: 1, offsetX: (1 - scaleX) / 2, offsetY: 0 };
}

/** Normalize -0 to 0: `-0 * k` stays -0 in JS, which breaks the exact-zero
 * at-rest contract in tests and leaks "-0deg" into transform strings. */
const zero = (v: number): number => (v === 0 ? 0 : v);

/**
 * Channel-separation vector in texture space for a pointer at normalized
 * screen offset (nx, ny) in [-1, 1], ny positive at the bottom. Red shifts
 * along +shift, blue along -shift, green stays centered. At the center the
 * shift is exactly 0, so the at-rest render is the unmodified image.
 */
export function chromaticShiftForPointer(
  nx: number,
  ny: number,
  chromaticShift: number,
): { readonly x: number; readonly y: number } {
  return { x: zero(nx * chromaticShift), y: zero(-ny * chromaticShift) };
}

/** Perspective tilt in degrees following the pointer. Zero at center. */
export function tiltForPointer(
  nx: number,
  ny: number,
  maxDeg: number,
): { readonly rotateX: number; readonly rotateY: number } {
  return { rotateX: zero(-ny * maxDeg), rotateY: zero(nx * maxDeg) };
}
