const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com/css2";
/** Google serves TTF (which Satori can parse) only to non-modern user agents. */
const LEGACY_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600;
  style: "normal";
};

/**
 * Social cards are the one surface rendered outside the browser, so they
 * cannot reach the next/font stylesheet. Pull the TTF at build time instead,
 * and fall back to Satori's built-in families if the fetch is unavailable —
 * a card in the wrong face beats a build that fails offline.
 */
export async function loadOgFont(
  family: string,
  weight: 400 | 500 | 600,
): Promise<OgFont | null> {
  try {
    const query = `${GOOGLE_FONTS_CSS}?family=${encodeURIComponent(family)}:wght@${weight}`;
    const css = await fetch(query, { headers: { "User-Agent": LEGACY_UA } });
    if (!css.ok) return null;

    const source = /src:\s*url\((https:[^)]+)\)\s*format\('truetype'\)/.exec(
      await css.text(),
    );
    if (!source) return null;

    const file = await fetch(source[1]);
    if (!file.ok) return null;

    return { name: family, data: await file.arrayBuffer(), weight, style: "normal" };
  } catch {
    return null;
  }
}
