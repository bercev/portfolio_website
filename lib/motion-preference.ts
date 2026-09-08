/** Dedicated no-animation site. Never boots WebGL. */
export const PLAIN_PATH = "/plain";

export function isPlainPath(pathname: string | null | undefined) {
  return pathname === PLAIN_PATH;
}
