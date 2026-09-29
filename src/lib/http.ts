import "server-only";
import { NextResponse } from "next/server";
import { ActionError } from "./actions";
import { ConfigError, publicMessage } from "./server";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status: number, code = "error") {
  return json({ error: message, code }, status);
}

/** Maps known errors to clean responses. Logs only the error class and message — never request bodies or PII. */
export function handleError(e: unknown, where: string) {
  if (e instanceof ActionError) return fail(e.message, e.status, e.code);
  if (e instanceof ConfigError) return fail(e.message, 500, "config");
  console.error(`[${where}]`, e instanceof Error ? `${e.name}: ${e.message}` : "unknown error");
  return fail(publicMessage(e), 500);
}

export async function idParam(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!UUID_RE.test(id)) throw new ActionError("Invalid candidate id.", 400, "bad_id");
  return id;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ActionError("Request body must be JSON.", 400, "bad_json");
  }
}
