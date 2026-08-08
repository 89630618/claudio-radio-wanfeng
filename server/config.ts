import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    process.env[key] ??= value.replace(/^["']|["']$/g, "");
  }
}
const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), ".data"));

const aiProvider =
  process.env.AI_PROVIDER ??
  (process.env.DEEPSEEK_API_KEY ? "deepseek" : process.env.OPENAI_API_KEY ? "openai" : "");

export const config = {
  port: Number(process.env.PORT ?? 3080),
  host: process.env.CLAUDIO_HOST ?? "127.0.0.1",
  libraryDir: process.env.MUSIC_LIBRARY_DIR ?? "",
  dataDir,
  userProfileDir: path.resolve(process.env.USER_PROFILE_DIR ?? path.join(dataDir, "user")),
  aiProvider,
  aiBaseUrl: process.env.AI_BASE_URL ?? "https://tokenflux.dev/v1",
  aiKey:
    process.env.AI_API_KEY ??
    (process.env.AI_PROVIDER === "openai" ? process.env.OPENAI_API_KEY : process.env.DEEPSEEK_API_KEY) ??
    process.env.OPENAI_API_KEY ??
    "",
  aiBackupKey: process.env.AI_BACKUP_KEY ?? "",
  aiModel:
    process.env.AI_MODEL ??
    (aiProvider === "openai" ? process.env.OPENAI_MODEL ?? "gpt-5.4-mini" : "deepseek-chat"),
  djAiModel: process.env.DJ_AI_MODEL ?? "",
  djAiTemperature: Number(process.env.DJ_AI_TEMPERATURE ?? 0.85),
  djAiTimeoutMs: Number(process.env.DJ_AI_TIMEOUT_MS ?? 30000),
  djAiReasoningEffort: process.env.DJ_AI_REASONING_EFFORT ?? "low",
  chatAiProvider: process.env.CHAT_AI_PROVIDER ?? "deepseek",
  chatAiBaseUrl: process.env.CHAT_AI_BASE_URL ?? "https://api.deepseek.com/v1",
  chatAiKey: process.env.CHAT_AI_API_KEY ?? "",
  chatAiModel: process.env.CHAT_AI_MODEL ?? "deepseek-v4-flash",
  openAiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.3",
  fishTtsKey: process.env.FISH_TTS_API_KEY ?? process.env.FISH_API_KEY ?? "",
  fishTtsEndpoint: process.env.FISH_TTS_ENDPOINT ?? "https://api.fish.audio/v1/tts",
  fishTtsModel: process.env.FISH_TTS_MODEL ?? "s2.1-pro-free",
  fishTtsVoiceId: process.env.FISH_TTS_VOICE_ID ?? "",
  fishTtsFormat: process.env.FISH_TTS_FORMAT ?? "mp3",
  fishTtsLatency: process.env.FISH_TTS_LATENCY ?? "normal",
  fishTtsProxy: process.env.FISH_TTS_PROXY ?? "",
  llmProxy: process.env.LLM_PROXY ?? process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? "",
  weatherLatitude: Number(process.env.WEATHER_LATITUDE ?? 31.2304),
  weatherLongitude: Number(process.env.WEATHER_LONGITUDE ?? 121.4737),
  weatherCity: process.env.WEATHER_CITY ?? "涓婃捣",
  kugouApiBaseUrl: process.env.KUGOU_API_BASE_URL ?? "http://127.0.0.1:3400",
  kugouApiAutostart: process.env.KUGOU_API_AUTOSTART
    ? process.env.KUGOU_API_AUTOSTART === "true"
    : process.env.NODE_ENV !== "production"
};

export type WeatherLocationSource = "browser" | "manual" | "fallback";

let runtimeLat: number | undefined;
let runtimeLng: number | undefined;
let runtimeCity: string | undefined;
let runtimeSource: WeatherLocationSource | undefined;

export function setWeatherLocation(lat: number, lng: number, city: string, source: WeatherLocationSource = "manual") {
  runtimeLat = lat;
  runtimeLng = lng;
  runtimeCity = city;
  runtimeSource = source;
}

export function getWeatherLocation() {
  return {
    lat: runtimeLat ?? config.weatherLatitude,
    lng: runtimeLng ?? config.weatherLongitude,
    city: runtimeCity ?? config.weatherCity,
    source: runtimeSource ?? "fallback"
  };
}
