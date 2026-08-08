import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { config } from "./config.js";

export type TtsPurpose = "dj";

export type TtsResult =
  | {
      ok: true;
      audioUrl: string;
      cacheHit: boolean;
      source: "fish";
      fileName: string;
    }
  | {
      ok: false;
      fallback: "browser";
      error: string;
    };

const ttsDir = path.join(config.dataDir, "tts");
const maxTextLength = 500;
const fishDispatcher = config.fishTtsProxy ? new ProxyAgent(config.fishTtsProxy) : undefined;

export function getTtsFilePath(fileName: string) {
  if (!/^[a-f0-9]{64}\.(mp3|wav|ogg)$/i.test(fileName)) {
    throw new Error("invalid tts file");
  }
  return path.join(ttsDir, fileName);
}

export async function synthesizeTts(text: string, purpose: TtsPurpose = "dj", options: { refresh?: boolean } = {}): Promise<TtsResult> {
  const cleanText = text.trim();
  if (!cleanText) return browserFallback("empty text");
  if (cleanText.length > maxTextLength) return browserFallback("text too long");
  if (purpose !== "dj") return browserFallback("unsupported tts purpose");
  if (!config.fishTtsKey) return browserFallback("FISH_TTS_API_KEY is not configured");

  fs.mkdirSync(ttsDir, { recursive: true });
  const format = normalizeFormat(config.fishTtsFormat);
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({
      text: cleanText,
      voice: config.fishTtsVoiceId,
      model: config.fishTtsModel,
      format,
      latency: config.fishTtsLatency
    }))
    .digest("hex");
  const fileName = `${hash}.${format}`;
  const filePath = path.join(ttsDir, fileName);

  if (!options.refresh && fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    return { ok: true, audioUrl: `/api/tts/${fileName}`, cacheHit: true, source: "fish", fileName };
  }

  let lastError = "Fish TTS request failed";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const request = undiciFetch(config.fishTtsEndpoint, {
      method: "POST",
      dispatcher: fishDispatcher,
      headers: {
        Authorization: `Bearer ${config.fishTtsKey}`,
        "Content-Type": "application/json",
        model: config.fishTtsModel
      },
      body: JSON.stringify({
        text: cleanText,
        format,
        latency: config.fishTtsLatency,
        ...(config.fishTtsVoiceId ? { reference_id: config.fishTtsVoiceId } : {})
      })
      });
      const response = await withRequestTimeout(request, 30000);

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        lastError = `Fish TTS failed: ${response.status}${detail ? ` ${detail.slice(0, 180)}` : ""}`;
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
          await waitForRetry();
          continue;
        }
        if (response.status === 401) {
          return browserFallback("Fish TTS API key is invalid or expired; update FISH_TTS_API_KEY");
        }
        return browserFallback(lastError);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length >= 128) {
        fs.writeFileSync(filePath, bytes);
        return { ok: true, audioUrl: `/api/tts/${fileName}`, cacheHit: false, source: "fish", fileName };
      }
      lastError = "Fish TTS returned empty audio";
    } catch (error) {
      if (error instanceof Error) {
        const cause = "cause" in error && error.cause instanceof Error ? `; cause=${error.cause.message}` : "";
        lastError = `${error.name}: ${error.message}${cause}`;
      }
    }
    if (attempt === 0) await waitForRetry();
  }
  return browserFallback(`${lastError} after one retry`);
}

function browserFallback(error: string): TtsResult {
  return { ok: false, fallback: "browser", error };
}

function waitForRetry() {
  return new Promise<void>((resolve) => setTimeout(resolve, 500));
}

async function withRequestTimeout(request: Promise<Response>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`request timed out after ${timeoutMs}ms`);
      error.name = "AbortError";
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([request, timeout]);
  } catch (error) {
    void request.then((response) => response.arrayBuffer()).catch(() => undefined);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeFormat(value: string) {
  const format = value.toLowerCase();
  return format === "wav" || format === "ogg" ? format : "mp3";
}
