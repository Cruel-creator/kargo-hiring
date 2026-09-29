import { NAME_TOKEN } from "./ai";
import { firstName } from "./pii";

export class ResendError extends Error {
  constructor(
    message: string,
    readonly kind: "config" | "invalid_email" | "provider" | "network",
    readonly status = 502,
  ) {
    super(message);
  }
}

export function isValidEmail(s: string | null | undefined): s is string {
  if (!s) return false;
  const v = s.trim();
  return v.length <= 254 && /^[^\s@<>(),;:"[\]\\]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/.test(v);
}

export function defaultSignature() {
  return (process.env.HIRING_SIGNATURE || "Arjun Mehta\\nFounder, Kargo").replace(/\\n/g, "\n");
}

/** Server-side name insertion: the model only ever wrote {{first_name}}. */
export function personalise(body: string, candidateName: string | null, signature = defaultSignature()): string {
  const name = firstName(candidateName) ?? "there";
  const filled = body.replaceAll(NAME_TOKEN, name).trim();
  return signature ? `${filled}\n\n${signature}` : filled;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export interface SendArgs {
  apiKey: string | undefined;
  from: string | undefined;
  fromName?: string;
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
  fetchImpl?: typeof fetch;
}

export async function sendViaResend(a: SendArgs): Promise<{ id: string }> {
  if (!a.apiKey) throw new ResendError("RESEND_API_KEY is not configured on the server.", "config", 500);
  if (!a.from || !isValidEmail(a.from)) throw new ResendError("HIRING_FROM_EMAIL is missing or invalid.", "config", 500);
  if (!isValidEmail(a.to)) throw new ResendError("The recipient email address is invalid.", "invalid_email", 400);

  const from = a.fromName ? `${a.fromName.replace(/[<>"]/g, "")} <${a.from}>` : a.from;
  let res: Response;
  try {
    res = await (a.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${a.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": a.idempotencyKey,
      },
      body: JSON.stringify({ from, to: [a.to.trim()], subject: a.subject, text: a.text, html: textToHtml(a.text) }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    throw new ResendError(`Could not reach Resend (${e instanceof Error ? e.name : "network error"}). Nothing was sent.`, "network", 503);
  }

  let data: { id?: string; message?: string; name?: string } = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok || !data.id) {
    const msg = data.message ? data.message.slice(0, 240) : `HTTP ${res.status}`;
    const kind = res.status === 422 && /email|to/i.test(msg) ? "invalid_email" : "provider";
    throw new ResendError(`Resend rejected the email: ${msg}`, kind, res.status === 422 ? 400 : 502);
  }
  return { id: data.id };
}

/** Stable per content: an identical retry is deduplicated by Resend; an edited draft gets a new key. */
export async function idempotencyKey(candidateId: string, to: string, subject: string, body: string) {
  const bytes = new TextEncoder().encode(`${candidateId}\n${to}\n${subject}\n${body}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `kargo-${candidateId}-${hex.slice(0, 24)}`;
}
