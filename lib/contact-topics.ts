/** Contact topic chips (run-3 iter 2): the tap-to-start topics offered
 * above the contact form's message field.
 *
 * A chip never clobbers typed text: on an empty message it fills the
 * topic prefix; on a non-empty message it prepends the prefix; when the
 * message already starts with a topic prefix (any topic), tapping another
 * chip swaps that prefix instead of stacking a second one. */

export type ContactTopic = {
  readonly label: string;
  /** Always of the form "Topic: <label> — " (trailing space included). */
  readonly prefix: string;
};

export const CONTACT_TOPICS: readonly ContactTopic[] = [
  { label: "Hiring", prefix: "Topic: Hiring — " },
  { label: "Collaboration", prefix: "Topic: Collaboration — " },
  { label: "Research question", prefix: "Topic: Research question — " },
];

/** Leading "Topic: ... — " prefix, if the message starts with one. */
const LEADING_TOPIC_RE = /^Topic: [^—\n]*— /;

export function applyTopicPrefix(message: string, prefix: string): string {
  if (message === "") return prefix;
  const existing = message.match(LEADING_TOPIC_RE);
  if (existing) return prefix + message.slice(existing[0].length);
  return prefix + message;
}
