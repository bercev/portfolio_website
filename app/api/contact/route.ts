import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

// Simple in-memory rate limit: 5 submissions per IP per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const prev = hits.get(ip) ?? [];
  const recent = prev.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "rate limit exceeded — try again in a few minutes" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { name, email, message } = (body ?? {}) as {
    name?: unknown;
    email?: unknown;
    message?: unknown;
  };

  if (typeof name !== "string" || name.trim().length < 2 || name.length > 80) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 120) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  if (
    typeof message !== "string" ||
    message.trim().length < 10 ||
    message.length > 2000
  ) {
    return NextResponse.json({ error: "invalid message" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error(
      "[contact] RESEND_API_KEY or CONTACT_TO_EMAIL is not configured",
    );
    return NextResponse.json(
      { error: "contact form is not configured yet — try again later" },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);
  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const cleanMessage = message.trim();

  try {
    const { error } = await resend.emails.send({
      from: "Portfolio Contact <onboarding@resend.dev>",
      to,
      replyTo: cleanEmail,
      subject: `[portfolio] message from ${cleanName}`,
      text: `From: ${cleanName} <${cleanEmail}>\n\n${cleanMessage}`,
    });
    if (error) {
      console.error("[contact] resend error:", error.message);
      return NextResponse.json(
        { error: "failed to send — try again later" },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("[contact] unexpected send failure:", err);
    return NextResponse.json(
      { error: "failed to send — try again later" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
