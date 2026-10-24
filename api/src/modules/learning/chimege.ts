import { env } from "../../config.ts";

// Chimege (chimege.com) Mongolian text-to-speech for cards and dictation.
// The token stays on the server; the browser gets audio back through the
// erxes gateway.

export const chimegeEnabled = () => Boolean(env.CHIMEGE_TOKEN);

const split = (value: string | undefined, fallback: string[]) =>
  value ? value.split(",").map((s) => s.trim()).filter(Boolean) : fallback;

// Tried in order; the first endpoint that answers successfully is remembered.
const TTS_URLS = () =>
  split(env.CHIMEGE_TTS_URL, ["https://api.chimege.com/v1.2/synthesize", "https://api.chimege.com/v1.0/tts"]);

let ttsUrl: string | null = null;

const MAX_CACHE = 300;
const ttsCache = new Map<string, { audio: string; mimeType: string }>();

const describe = async (response: Response) =>
  `${response.status} ${(await response.text().catch(() => "")).slice(0, 200)}`;

/** Mongolian speech for `text` as base64 audio (cached per text). */
export const synthesize = async (text: string) => {
  const key = `${env.CHIMEGE_SPEED}|${text}`;
  const cached = ttsCache.get(key);
  if (cached) return cached;
  if (!env.CHIMEGE_TOKEN) throw new Error("Chimege is off: set CHIMEGE_TOKEN in the plugin's .env");

  const errors: string[] = [];
  for (const url of ttsUrl ? [ttsUrl] : TTS_URLS()) {
    // Optional tuning headers first; retry bare in case the endpoint rejects them.
    for (const extra of [{ speed: env.CHIMEGE_SPEED, "voice-id": env.CHIMEGE_VOICE ?? "" }, {}]) {
      const headers: Record<string, string> = {
        "Content-Type": "text/plain; charset=utf-8",
        Token: env.CHIMEGE_TOKEN,
      };
      for (const [name, value] of Object.entries(extra)) if (value) headers[name] = value;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: text,
        signal: AbortSignal.timeout(20_000),
      }).catch((error: unknown) => {
        errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      });
      if (!response) break;
      const type = response.headers.get("content-type") ?? "";
      if (response.ok && !type.includes("json") && !type.startsWith("text/")) {
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > 100) {
          ttsUrl = url;
          const result = { audio: buffer.toString("base64"), mimeType: type.startsWith("audio/") ? type : "audio/wav" };
          if (ttsCache.size >= MAX_CACHE) ttsCache.delete(ttsCache.keys().next().value ?? "");
          ttsCache.set(key, result);
          return result;
        }
      }
      errors.push(`${url}: ${await describe(response)}`);
      if (response.status === 404) break; // wrong endpoint — next URL
    }
  }
  throw new Error(`Chimege TTS failed — ${errors.join(" | ")}`);
};
