"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "sent" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("$ name: too short (min 2 chars)");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("$ email: invalid address");
      return;
    }
    if (message.trim().length < 10) {
      setError("$ message: too short (min 10 chars)");
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

      <label className="journey-contact-form-field">
        <span className="journey-contact-form-label">$ whoami</span>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          autoComplete="name"
          maxLength={80}
          disabled={status === "sending"}
          className="journey-contact-form-input"
        />
      </label>

      <label className="journey-contact-form-field">
        <span className="journey-contact-form-label">$ your return address</span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={120}
          disabled={status === "sending"}
          className="journey-contact-form-input"
        />
      </label>

      <label className="journey-contact-form-field">
        <span className="journey-contact-form-label">$ cat message.txt</span>
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="what's on your mind?"
          rows={5}
          maxLength={2000}
          disabled={status === "sending"}
          className="journey-contact-form-input journey-contact-form-textarea"
        />
      </label>

      {error ? (
        <p className="journey-contact-form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="journey-contact-form-submit"
      >
        {status === "sending" ? "[transmitting…]" : "[transmit →]"}
      </button>
    </form>
  );
}
