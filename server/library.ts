import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { upsertTracks } from "./db.js";
import type { Track } from "./types.js";

const playableExtensions = new Set([".mp3", ".flac", ".m4a", ".wav", ".aac", ".ogg"]);
const indexedCacheExtensions = new Set([".kgma", ".kgg"]);

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isKugouCachePath(filePath: string) {
  return filePath.toLowerCase().split(path.sep).includes("kugoumusic");
}

function isPlayableExtension(extension: string) {
  return playableExtensions.has(extension);
}

function shouldIndexExtension(extension: string) {
  return playableExtensions.has(extension) || indexedCacheExtensions.has(extension);
}

function parseTrack(filePath: string, rootDir: string, size: number): Track {
  const parsed = path.parse(filePath);
  const extension = parsed.ext.toLowerCase();
  const folder = path.basename(parsed.dir);
  const relative = path.relative(rootDir, filePath);
  const id = crypto.createHash("sha1").update(filePath).digest("hex").slice(0, 16);
  const source = isKugouCachePath(filePath) ? "kugou-cache" : "main";

  const name = normalizeName(parsed.name);
  const dashMatch = name.match(/^(.+?)\s[-\u2013\u2014]\s(.+)$/);
  const artist = normalizeName(dashMatch?.[1] ?? folder ?? "Unknown Artist");
  const title = normalizeName(dashMatch?.[2] ?? name);

  return {
    id,
    title: title || parsed.name,
    artist: artist || "Unknown Artist",
    album: folder || "Local Library",
    filePath,
    folder: relative,
    extension: extension.replace(".", ""),
    source,
    playable: source === "main" && isPlayableExtension(extension),
    size,
    addedAt: new Date().toISOString()
  };
}

async function walk(dir: string, rootDir: string, tracks: Track[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, rootDir, tracks);
      continue;
    }

    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (!shouldIndexExtension(extension)) continue;

    const stat = await fs.stat(fullPath);
    tracks.push(parseTrack(fullPath, rootDir, stat.size));
  }
}

export async function scanLibrary(rootDir = config.libraryDir) {
  const tracks: Track[] = [];
  await fs.access(rootDir);
  await walk(rootDir, rootDir, tracks);
  upsertTracks(tracks);
  return tracks;
}
