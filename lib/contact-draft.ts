/** Contact draft autosave (run-3 iter 11): the contact form's typed-but-
 * unsent draft survives a refresh or an accidental navigation.
 *
 * The draft lives ONLY in the visitor's own browser (localStorage) — it is
 * never sent anywhere until they press transmit, and the transmitted payload
 * stays exactly { name, email, message }.
 *
 * Pure functions here (storage IO stays in the component, wrapped in
 * try/catch so a denied quota or private mode can never break the form):
 *
 * - restore happens once on mount, when the fields are initial-empty, so a
 *   restored draft can never clobber a topic-chip prefill — and a restored
 *   non-empty message counts as non-empty for the chip append/swap rules in
 *   lib/contact-topics.ts (a chip prepends or swaps, never overwrites).
 * - writes are debounced (~500ms) in the component, not per keystroke.
 * - a successful transmit clears the draft; validation failure and send
 *   errors keep it (a failed send is exactly when the draft matters).
 * - an oversized draft is refused (previous stored value left untouched),
 *   never persisted — the form's own maxLengths (80/120/2000) already bound
 *   honest input well under the cap, so refusal only bites on
 *   programmatic abuse.
 */

export type ContactDraft = {
  readonly name: string;
  readonly email: string;
  readonly message: string;
};

/** Versioned key so a future draft format never misreads an old one. */
export const CONTACT_DRAFT_KEY = "bercev-contact-draft-v1";

/** Serialized-JSON ceiling: a few KB, far above the ~2.3KB honest maximum. */
export const CONTACT_DRAFT_MAX_SERIALIZED = 4096;

/** Per-field ceilings, mirroring the form's maxLength attributes. */
const FIELD_MAX = { name: 80, email: 120, message: 2000 } as const;

/** Parse a stored value. Anything malformed, mistyped, or over-long is not
 *  a draft — null, so the form starts empty instead of showing garbage. */
export function parseContactDraft(raw: unknown): ContactDraft | null {
  if (typeof raw !== "string" || raw === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { name, email, message } = parsed as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string"
  ) {
    return null;
  }
  if (
    name.length > FIELD_MAX.name ||
    email.length > FIELD_MAX.email ||
    message.length > FIELD_MAX.message
  ) {
    return null;
  }
  if (name === "" && email === "" && message === "") return null;
  return { name, email, message };
}

export type ContactDraftAction =
  | { readonly action: "write"; readonly value: string }
  | { readonly action: "clear" }
  | { readonly action: "skip" };

/** Decide what a save should do with the current fields:
 *  - all empty → clear (no stale draft lingers after a manual wipe);
 *  - normal → write the serialized draft;
 *  - over the serialized ceiling → skip (refuse, keep the previous value).
 */
export function contactDraftAction(draft: ContactDraft): ContactDraftAction {
  if (draft.name === "" && draft.email === "" && draft.message === "") {
    return { action: "clear" };
  }
  const value = JSON.stringify(draft);
  if (value.length > CONTACT_DRAFT_MAX_SERIALIZED) {
    return { action: "skip" };
  }
  return { action: "write", value };
}
