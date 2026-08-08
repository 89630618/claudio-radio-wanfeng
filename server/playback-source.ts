import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { getTrack, getTracks } from "./db.js";
import { getKuGouSongPlaybackUrl } from "./kugou.js";
import type { PlaybackSource } from "./types.js";

const apiSourceTtlMs = 30 * 60 * 1000;
const apiSourceCache = new Map<string, { expiresAt: number; source: PlaybackSource }>();
const cachePath = path.join(config.dataDir, "playback-source-cache-v2.json");
let cacheLoaded = false;

function loadPersistentCache() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const saved = JSON.parse(fs.readFileSync(cachePath, "utf8")) as Record<string, { expiresAt: number; source: PlaybackSource }>;
    for (const [trackId, value] of Object.entries(saved)) {
      if (value.expiresAt > Date.now()) apiSourceCache.set(trackId, value);
    }
  } catch {
    // Cache is optional and can be rebuilt.
  }
}

function persistCache() {
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(Object.fromEntries(apiSourceCache)), "utf8");
  } catch {
    // Playback must not fail when cache persistence is unavailable.
  }
}

export async function resolvePlaybackSource(trackId: string): Promise<PlaybackSource> {
  loadPersistentCache();
  const track = getTrack(trackId);
  if (!track) {
    throw new Error("track not found");
  }

  const cached = apiSourceCache.get(trackId);
  if (cached && cached.expiresAt > Date.now()) return cached.source;
  apiSourceCache.delete(trackId);

  const remote = await getKuGouSongPlaybackUrl({
    title: track.title,
    artist: track.artist,
    hash: track.filePath.startsWith("kugou://") ? track.filePath.slice("kugou://".length) : undefined
  }).catch(() => null);
  if (!remote?.url) throw new Error("api playback source unavailable");

  const source: PlaybackSource = {
    mode: "api",
    streamUrl: remote.url,
    source: "kugou-api",
    reason: `KuGou match ${remote.matchedSong.artist ?? ""} - ${remote.matchedSong.title} (${remote.matchScore})`
  };
  apiSourceCache.set(trackId, { expiresAt: Date.now() + apiSourceTtlMs, source });
  persistCache();
  return source;
}

export async function warmPlaybackSourceCache(limit = 240) {
  loadPersistentCache();
  const tracks = getTracks(limit, "", { playableOnly: true }).filter((track) => track.source === "kugou-api");
  for (let start = 0; start < tracks.length; start += 8) {
    await Promise.all(tracks.slice(start, start + 8).map((track) => resolvePlaybackSource(track.id).catch(() => undefined)));
  }
}

export function clearPlaybackSourceCache(trackId: string) {
  apiSourceCache.delete(trackId);
}
