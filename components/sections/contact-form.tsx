"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { StatefulSubmitButton } from "@/components/ui/stateful-button";
import {
  CONTACT_DRAFT_KEY,
  contactDraftAction,
  parseContactDraft,
} from "@/lib/contact-draft";
import { CONTACT_TOPICS, applyTopicPrefix } from "@/lib/contact-topics";

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
  useEffect(() => {
    try {
      const draft = parseContactDraft(
        window.localStorage.getItem(CONTACT_DRAFT_KEY),
      );
      if (draft !== null) {
        setName(draft.name);
        setEmail(draft.email);
        setMessage(draft.message);
      }
    } catch {
      // No usable storage — the form simply starts empty.
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
      fail("name", "$ name: too short (min 2 chars)");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      fail("email", "$ email: invalid address");
      return;
    }
    if (message.trim().length < 10) {
      fail("message", "$ message: too short (min 10 chars)");
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
        err instanceof Error ? `$ send failed: ${err.message}` : "$ send failed",
      );
    }
  }

  if (status === "sent") {
    return (
      <div className="journey-contact-form" role="status" aria-live="polite">
        <pre className="journey-contact-form-receipt">
{`┌─────────────────────────────────┐
│  [transmission received ✓]      │
│  thanks — I'll get back to you  │
└─────────────────────────────────┘`}
        </pre>
      </div>
    );
  }

  const describedBy = error ? ERROR_ID : undefined;

  return (
    <form
      className="journey-contact-form"
      onSubmit={onSubmit}
      aria-label="Contact form"
      noValidate
    >
      <p className="journey-contact-form-prompt" aria-hidden="true">
        <span className="journey-contact-form-ps1">bercev@portfolio:~$</span>{" "}
        ./send-message.sh
      </p>

      {/* Visible labels are terminal jargon by design ("$ whoami") — the
          inputs carry honest aria-labels so assistive tech announces
          "Your name" / "Your email address" / "Your message". */}
      <label className="journey-contact-form-field">
        <span className="journey-contact-form-label">$ whoami</span>
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
        <span className="journey-contact-form-label">$ your return address</span>
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
          already-typed text (see lib/contact-topics.ts). Placed inside the
          terminal frame directly above the message field, so the chip sits
          next to the field it fills; real buttons, keyboard + screen-reader
          reachable, and the transmit burst's fire-time origin read is
          unaffected (the origin is resolved at submit-click time). */}
      <div
        className="journey-contact-form-topics"
        role="group"
        aria-label="Start your message with a topic"
      >
        <span className="journey-contact-form-label" aria-hidden="true">
          $ topic
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
              {topic.label}
            </button>
          ))}
        </span>
      </div>

      <label className="journey-contact-form-field">
        <span className="journey-contact-form-label">$ cat message.txt</span>
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
          idle-reset (error). Success is the receipt panel above — the site's
          intentional success state — so the button never holds a "sent" state. */}
      <StatefulSubmitButton
        state={status}
        className="journey-contact-form-submit"
      >
        {status === "sending" ? "[transmitting…]" : "[transmit →]"}
      </StatefulSubmitButton>
    </form>
  );
}
