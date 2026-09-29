import "server-only";
import { createGeminiClient, type GeminiClient } from "./gemini";
import type { Repo } from "./repo";
import { createSupabaseRepo } from "./repo-supabase";

/** Single place that reads secrets. Nothing here is NEXT_PUBLIC_, so nothing reaches the browser. */

export class ConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`Server is missing configuration: ${missing.join(", ")}. Add them to .env.local (or Vercel env vars) and restart.`);
  }
}

export function configStatus() {
  const e = process.env;
  return {
    supabaseUrl: !!e.SUPABASE_URL,
    supabaseKey: !!(e.SUPABASE_SERVICE_ROLE_KEY || e.SUPABASE_ANON_KEY),
    usingServiceRole: !!e.SUPABASE_SERVICE_ROLE_KEY,
    gemini: !!e.GEMINI_API_KEY,
    geminiModel: e.GEMINI_MODEL || "gemini-2.5-flash",
    resend: !!e.RESEND_API_KEY,
    fromEmail: e.HIRING_FROM_EMAIL || null,
    redirectTo: e.EMAIL_REDIRECT_TO || null,
  };
}

let repo: Repo | null = null;
export function getRepo(): Repo {
  const e = process.env;
  const key = e.SUPABASE_SERVICE_ROLE_KEY || e.SUPABASE_ANON_KEY;
  const missing = [!e.SUPABASE_URL && "SUPABASE_URL", !key && "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)"].filter(Boolean) as string[];
  if (missing.length) throw new ConfigError(missing);
  repo ??= createSupabaseRepo(e.SUPABASE_URL!, key!);
  return repo;
}

export function getGemini(): GeminiClient {
  return createGeminiClient({ apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL });
}

export function emailEnv() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.HIRING_FROM_EMAIL,
    fromName: process.env.HIRING_FROM_NAME || "Arjun Mehta",
    redirectTo: process.env.EMAIL_REDIRECT_TO || null,
  };
}

/** Error messages safe to show in the UI: no stack traces, no secrets. */
export function publicMessage(e: unknown): string {
  if (e instanceof Error) return e.message.replace(/(key|token)=[^&\s]+/gi, "$1=***").slice(0, 400);
  return "Unexpected server error.";
}
