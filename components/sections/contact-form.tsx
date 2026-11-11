"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";

import { StatefulSubmitButton } from "@/components/ui/stateful-button";
import {
  CONTACT_DRAFT_KEY,
  contactDraftAction,
  parseContactDraft,
} from "@/lib/contact-draft";
import {
  contactFlowFormEnter,
  contactFlowFormExit,
  contactFlowGlowTransition,
  contactFlowReceiptEnter,
  contactFlowScrollTarget,
} from "@/lib/contact-flow";
import { flowLabels } from "@/lib/plate-labels";
import {
  CONTACT_TOPICS,
  applyTopicPrefix,
  resolveTopicParam,
} from "@/lib/contact-topics";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

import { ContactLightFlow } from "./contact-light-flow";

type Status = "idle" | "sending" | "sent" | "error";
type FieldName = "name" | "email" | "message";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ERROR_ID = "contact-form-error";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<FieldName | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  // Draft autosave (run-3 iter 11): false until the one-shot restore effect
  // below has run, so the debounced save never fires on the initial empty
  // fields and wipes a stored draft before it is read. Storage IO is
  // try/catch-guarded throughout — a denied quota or private mode must
  // never break the form.
  const [draftReady, setDraftReady] = useState(false);

  // Restore once on mount, when the fields are initial-empty: a stored
  // draft can never clobber a topic-chip prefill (chips only run on user
  // taps, after mount), and a restored non-empty message counts as
  // non-empty for the chip append/swap rules. Deliberately NOT a lazy
  // useState initializer: localStorage differs at SSR, which would be a
  // hydration mismatch (see the run-2 iter 43 sign).
  //
  // Deep-linkable topics (run-3 iter 16) are resolved in THIS same
  // effect, not a second one: a second mount effect reading `message`
  // state would still see the initial "" (state updates batch), so it
  // could not tell a restored draft from an empty form. Precedence, by
  // design: the visitor's own words always win — a ?topic= value applies
  // ONLY when the restored message is empty (a draft with a name/email
  // but an empty message still gets the prefill; a non-empty draft keeps
  // its own topic and body untouched). Unknown values are ignored by
  // resolveTopicParam, never rendered. Read via window.location in the
  // mount effect (not useSearchParams) so no Suspense boundary is needed
  // and SSR output is untouched.
  useEffect(() => {
    let restoredMessage = "";
    try {
      const draft = parseContactDraft(
        window.localStorage.getItem(CONTACT_DRAFT_KEY),
      );
      if (draft !== null) {
        setName(draft.name);
        setEmail(draft.email);
        setMessage(draft.message);
        restoredMessage = draft.message;
      }
    } catch {
      // No usable storage — the form simply starts empty.
    }
    if (restoredMessage === "") {
      const topic = resolveTopicParam(
        new URLSearchParams(window.location.search).get("topic"),
      );
      if (topic !== null) setMessage(topic.prefix);
    }
    setDraftReady(true);
  }, []);

  // Debounced save (~500ms, not per keystroke). Skipped while status is
  // "sent": the success branch clears the key, and this guard stops the
  // effect from resurrecting the sent message after the receipt renders.
  // Validation failure and send errors never reach the clear branch, so a
  // failed send keeps the draft — exactly when it matters.
  useEffect(() => {
    if (!draftReady || status === "sent") return;
    const timer = window.setTimeout(() => {
      try {
        const action = contactDraftAction({ name, email, message });
        if (action.action === "write") {
          window.localStorage.setItem(CONTACT_DRAFT_KEY, action.value);
        } else if (action.action === "clear") {
          window.localStorage.removeItem(CONTACT_DRAFT_KEY);
        }
        // "skip" (oversized): refuse, leaving the previous draft untouched.
      } catch {
        // Storage unavailable — drafting in memory only.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [name, email, message, draftReady, status]);

  function fail(field: FieldName, message: string) {
    setInvalidField(field);
    setError(message);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInvalidField(null);

    if (name.trim().length < 2) {
      fail("name", "01 · Your name needs at least 2 characters");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      fail("email", "02 · That email address doesn't look right");
      return;
    }
    if (message.trim().length < 10) {
      fail("message", "03 · Your message needs at least 10 characters");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? `request failed (${res.status})`);
      }
      setStatus("sent");
      // Draft autosave: a sent message must not resurrect — clear the
      // stored draft (the save effect's "sent" guard stops it rewriting).
      try {
        window.localStorage.removeItem(CONTACT_DRAFT_KEY);
      } catch {
        // Storage unavailable — nothing stored to clear.
      }
      // Transmit burst (run-2 IDEA iter 24, built iter 50): a
      // successful submit fires a one-shot dithered shockwave on
      // the glyph field from the form's position — the terminal's
      // keystroke-event pattern, applied to the conversion climax.
      // Fires only on success, never on error or validation
      // failure; the field listener resolves the origin at fire
      // time (the receipt panel keeps this form's class).
      window.dispatchEvent(new CustomEvent("contact-transmit"));
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? `Couldn't send — ${err.message}`
          : "Couldn't send — please try again",
      );
    }
  }

  // Success cut (run-9 RUN9-FILE-THE-SHEET, re-skinned run-10
  // RUN10-CONTACT): on submit success the page cuts to the flow
  // container's top so the lift + glow play in view. On a phone the
  // Transmit button sits ~500px below the form's top, so without the
  // cut the receipt lands above the viewport and the visitor never
  // sees the confirmation. An instant cut, not a smooth scroll — a
  // second animation would fight the flow motion.
  useEffect(() => {
    if (status !== "sent") return;
    const el = flowRef.current;
    if (!el) return;
    window.scrollTo({
      top: contactFlowScrollTarget(
        el.getBoundingClientRect().top,
        window.scrollY,
      ),
      behavior: "instant",
    });
  }, [status]);

  // "Send another" (run-9 RUN9-FILE-THE-SHEET): the receipt offers a
  // way back to the form — name + email stay (they are the sender's
  // identity), only the sent message clears. The debounced draft save
  // then keeps the identity as a draft, as it would for any unsent form.
  function sendAnother() {
    setMessage("");
    setStatus("idle");
  }

  const describedBy = error ? ERROR_ID : undefined;
  const formEnter = contactFlowFormEnter(reduceMotion);
  const receiptEnter = contactFlowReceiptEnter(reduceMotion);

  // Flow motion (run-10 RUN10-CONTACT): on a genuine submit success
  // the form panel lifts away on light — it rises, scales down and
  // fades while the RECEIVED glow panel slides in from below with
  // next steps + a primary action. The receipt pop stays the settled
  // state language; reduced motion swaps instantly.
  return (
    <div className="journey-contact-flow" ref={flowRef}>
      <AnimatePresence initial={false}>
        {status === "sent" ? (
          <motion.div
            key="receipt"
            className="journey-contact-receipt"
            data-contact-receipt
            role="status"
            aria-live="polite"
            initial={receiptEnter.initial}
            animate={receiptEnter.animate}
            transition={receiptEnter.transition}
          >
            <motion.span
              className="journey-contact-glow"
              data-contact-glow
              aria-hidden="true"
              initial={
                reduceMotion
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 1.12 }
              }
              animate={{ opacity: 1, scale: 1 }}
              transition={contactFlowGlowTransition(reduceMotion)}
            >
              Received
            </motion.span>
            <p className="journey-contact-receipt-title">
              Transmission received
            </p>
            <p className="journey-contact-receipt-note">
              Thanks — I&rsquo;ll get back to you.
            </p>
            <p className="journey-contact-receipt-next">
              <span className="journey-contact-receipt-next-kicker">
                What&rsquo;s next —
              </span>{" "}
              I&rsquo;ll reply to {email} within a few days.
            </p>
            <a
              className="journey-contact-receipt-action"
              href="#projects"
              data-contact-receipt-action
            >
              See my work ↓
            </a>
            <button
              type="button"
              className="journey-contact-receipt-again"
              onClick={sendAnother}
              data-contact-receipt-again
            >
              Send another message →
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="journey-contact-form"
            onSubmit={onSubmit}
            aria-label="Contact form"
            noValidate
            initial={formEnter.initial}
            animate={formEnter.animate}
            transition={formEnter.transition}
            exit={contactFlowFormExit(reduceMotion)}
          >
      <div className="journey-contact-flow-head">
        <span className="journey-contact-flow-head-num">
          {flowLabels(0, 1).plate}
        </span>
        <span>To: Berat</span>
      </div>

      {/* Living light (run-10 RUN10-CONTACT): a wave of light drifts
          across the form's head — the line is live. Static under
          reduced motion. */}
      <ContactLightFlow />
      <p className="journey-contact-lightflow-caption" aria-hidden="true">
        <span>Light current</span>
        {/* Under reduced motion the wave is a static snapshot, so the
            caption drops "Flowing" — it would contradict the settled
            state (desktop critic, run-9 iter 8, same rule as the old
            ECG caption). */}
        <span>{reduceMotion ? "Still" : "Flowing"}</span>
      </p>

      {/* Visible labels are flow numbers by design ("01 / 03 —
          From") — the inputs carry honest aria-labels so assistive
          tech announces "Your name" / "Your email address" / "Your
          message". */}
      <label className="journey-contact-form-field">
        <span className="journey-contact-form-label">
          <span className="journey-contact-form-flownum">
            {flowLabels(0, 3).plate}
          </span>{" "}
          — From
        </span>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setInvalidField(null);
          }}
          placeholder="your name"
          autoComplete="name"
          maxLength={80}
          disabled={status === "sending"}
          aria-label="Your name"
          aria-invalid={invalidField === "name"}
          aria-describedby={invalidField === "name" ? describedBy : undefined}
          className="journey-contact-form-input"
        />
      </label>

      <label className="journey-contact-form-field">
        <span className="journey-contact-form-label">
          <span className="journey-contact-form-flownum">
            {flowLabels(1, 3).plate}
          </span>{" "}
          — Return address
        </span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setInvalidField(null);
          }}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={120}
          disabled={status === "sending"}
          aria-label="Your email address"
          aria-invalid={invalidField === "email"}
          aria-describedby={invalidField === "email" ? describedBy : undefined}
          className="journey-contact-form-input"
        />
      </label>

      {/* Topic chips (run-3 iter 2): a tap, not a blank field — tapping a
          chip starts the message with a topic prefix without clobbering
          already-typed text (see lib/contact-topics.ts). Placed directly
          above the message field, so the chip sits next to the field it
          fills; real buttons, keyboard + screen-reader reachable, and
          the transmit burst's fire-time origin read is unaffected (the
          origin is resolved at submit-click time). */}
      <div
        className="journey-contact-form-topics"
        role="group"
        aria-label="Start your message with a topic"
      >
        <span className="journey-contact-form-label" aria-hidden="true">
          Topic
        </span>
        <span className="journey-contact-form-topic-row">
          {CONTACT_TOPICS.map((topic) => (
            <button
              key={topic.label}
              type="button"
              disabled={status === "sending"}
              aria-pressed={message.startsWith(topic.prefix)}
              onClick={() => {
                setMessage(applyTopicPrefix(message, topic.prefix));
                setInvalidField(null);
                messageRef.current?.focus();
              }}
              className="journey-contact-form-topic-chip"
            >
              <span
                className="journey-contact-form-topicdot"
                aria-hidden="true"
              />
              {topic.label}
            </button>
          ))}
        </span>
      </div>

      <label className="journey-contact-form-field">
        <span className="journey-contact-form-label">
          <span className="journey-contact-form-flownum">
            {flowLabels(2, 3).plate}
          </span>{" "}
          — Message
        </span>
        <textarea
          ref={messageRef}
          name="message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setInvalidField(null);
          }}
          placeholder="what's on your mind?"
          rows={5}
          maxLength={2000}
          disabled={status === "sending"}
          aria-label="Your message"
          aria-invalid={invalidField === "message"}
          aria-describedby={invalidField === "message" ? describedBy : undefined}
          className="journey-contact-form-input journey-contact-form-textarea"
        />
      </label>

      {error ? (
        <p className="journey-contact-form-error" id={ERROR_ID} role="alert">
          {error}
        </p>
      ) : null}

      {/* Pre-built Aceternity Stateful Button: idle -> spinner (sending) ->
          idle-reset (error). Success is the receipt panel above — the
          site's intentional success state — so the button never holds a
          "sent" state. */}
      <StatefulSubmitButton
        state={status}
        className="journey-contact-form-submit"
      >
        {status === "sending" ? "Transmitting…" : "Transmit →"}
      </StatefulSubmitButton>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
