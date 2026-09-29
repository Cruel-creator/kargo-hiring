/**
 * Minimal Gemini REST client with structured JSON output.
 * Server-only: the API key is read from process.env and sent in a header, never in a URL.
 */

export class GeminiError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}

export type JsonSchema = Record<string, unknown>;

export interface GeminiClient {
  generateJson<T>(opts: { system: string; prompt: string; schema: JsonSchema; label: string }): Promise<T>;
}

export interface GeminiConfig {
  apiKey: string | undefined;
  model?: string;
  fetchImpl?: typeof fetch;
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

export function createGeminiClient(cfg: GeminiConfig): GeminiClient {
  const fetchImpl = cfg.fetchImpl ?? fetch;
  const model = cfg.model || DEFAULT_MODEL;
  const maxAttempts = cfg.maxAttempts ?? 4;
  const baseDelay = cfg.baseDelayMs ?? 1500;
  const timeoutMs = cfg.timeoutMs ?? 60_000;

  return {
    async generateJson<T>({ system, prompt, schema, label }: { system: string; prompt: string; schema: JsonSchema; label: string }) {
      if (!cfg.apiKey) throw new GeminiError("GEMINI_API_KEY is not configured.");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          topP: 1,
          candidateCount: 1,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      let lastErr: GeminiError | null = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await fetchImpl(url, {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": cfg.apiKey },
            body,
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!res.ok) {
            const retryable = res.status === 429 || res.status >= 500;
            let detail = "";
            try {
              detail = ((await res.json()) as { error?: { message?: string } })?.error?.message ?? "";
            } catch {}
            throw new GeminiError(`Gemini ${label} request failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`, retryable);
          }
          const data = (await res.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
            promptFeedback?: { blockReason?: string };
          };
          if (data.promptFeedback?.blockReason) throw new GeminiError(`Gemini blocked the ${label} request (${data.promptFeedback.blockReason}).`);
          const cand = data.candidates?.[0];
          const text = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
          if (!text) throw new GeminiError(`Gemini returned an empty ${label} response (${cand?.finishReason ?? "no candidate"}).`, true);
          try {
            return JSON.parse(stripFences(text)) as T;
          } catch {
            throw new GeminiError(`Gemini returned invalid JSON for ${label}.`, true);
          }
        } catch (e) {
          lastErr =
            e instanceof GeminiError
              ? e
              : new GeminiError(`Network error calling Gemini for ${label}: ${e instanceof Error ? e.name : "unknown"}`, true);
          if (!lastErr.retryable || attempt === maxAttempts) break;
          await sleep(baseDelay * 2 ** (attempt - 1) + Math.floor(Math.random() * 250));
        }
      }
      throw lastErr ?? new GeminiError(`Gemini ${label} failed.`);
    },
  };
}

function stripFences(s: string) {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
