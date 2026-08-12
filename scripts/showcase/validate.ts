import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { parseFile } from "music-metadata";
import { showcaseCatalog } from "../../src/showcase/catalog";
import type { ShowcaseTrack } from "../../src/showcase/types";

type Options = { publicDir: string; licensesText: string; maxMusicBytes?: number; readAudioDurationMs?: (path: string) => Promise<number>; minTracks?: number; rejectPlaceholder?: boolean };
const musicLimit = 20 * 1024 * 1024;
const clean = (value: string) => value.replace(/\r\n/g, "\n").trim();

function inside(publicDir: string, value: string) {
  if (!value || isAbsolute(value)) return null;
  const absolute = resolve(publicDir, value);
  const relation = relative(publicDir, absolute);
  return relation && !relation.startsWith("..") && !isAbsolute(relation) ? absolute : null;
}

export function renderAssetLicenses(catalog: ShowcaseTrack[]) {
  const lines = ["# Showcase Asset Licenses", "", "These entries apply to Showcase media only. They are not automatically covered by the repository Apache-2.0 license.", ""];
  for (const track of catalog) lines.push(`## ${track.artist} - ${track.title}`, "", `- Track ID: \`${track.id}\``, `- Music: \`${track.musicSrc}\``, `- Cover: \`${track.coverSrc}\``, `- DJ audio: \`${track.djAudioSrc}\``, `- License: ${track.rights.license}`, `- Source: ${track.rights.sourceUrl}`, `- Attribution: ${track.rights.attribution}`, `- Scope: ${track.rights.scope}`, `- Verified: ${track.rights.verifiedAt}`, "");
  return `${lines.join("\n").trim()}\n`;
}

async function audioDuration(path: string) {
  const metadata = await parseFile(path, { duration: true });
  if (!metadata.format.duration || !Number.isFinite(metadata.format.duration)) throw new Error("duration unavailable");
  return metadata.format.duration * 1000;
}

export async function validateShowcase(catalog: ShowcaseTrack[], options: Options) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  const readDuration = options.readAudioDurationMs ?? audioDuration;
  if (catalog.length < (options.minTracks ?? 1)) errors.push(`catalog requires at least ${options.minTracks ?? 1} tracks`);
  for (const track of catalog) {
    if (!track.id.trim()) errors.push("track id is required");
    if (ids.has(track.id)) errors.push(`duplicate track id: ${track.id}`);
    ids.add(track.id);
    if (!track.title.trim() || !track.artist.trim() || !track.album.trim() || !track.djText.trim()) errors.push(`${track.id}: complete track text is required`);
    if (!Number.isFinite(track.vocalStartMs) || track.vocalStartMs <= 0) errors.push(`${track.id}: vocalStartMs must be positive`);
    if (track.rights.status !== "cleared") errors.push(`${track.id}: rights.status must be cleared`);
    if (track.rights.scope !== "public-web-hosting") errors.push(`${track.id}: rights.scope must be public-web-hosting`);
    if (!track.rights.license.trim() || !track.rights.sourceUrl.trim() || !track.rights.attribution.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(track.rights.verifiedAt)) errors.push(`${track.id}: complete rights metadata is required`);
    if (options.rejectPlaceholder && /placeholder/i.test(`${track.album} ${track.rights.license}`)) errors.push(`${track.id}: placeholder assets are not release content`);
    for (const [kind, path] of [["music", track.musicSrc], ["cover", track.coverSrc], ["DJ audio", track.djAudioSrc]] as const) {
      if (paths.has(path)) errors.push(`${track.id}: duplicate asset path: ${path}`);
      paths.add(path);
      const absolute = inside(options.publicDir, path);
      if (!absolute) { errors.push(`${track.id}: invalid ${kind} path: ${path}`); continue; }
      try { const info = await stat(absolute); if (!info.isFile()) errors.push(`${track.id}: ${kind} is not a file`); if (kind === "music" && info.size > (options.maxMusicBytes ?? musicLimit)) errors.push(`${track.id}: music exceeds the 20 MiB size limit`); } catch { errors.push(`${track.id}: missing ${kind}: ${path}`); }
    }
    const dj = inside(options.publicDir, track.djAudioSrc);
    const music = inside(options.publicDir, track.musicSrc);
    if (dj) try { if (await readDuration(dj) / 0.86 + 800 > track.vocalStartMs) errors.push(`${track.id}: DJ duration at 0.86 speed must end at least 800ms before vocalStartMs`); } catch (error) { errors.push(`${track.id}: cannot read DJ audio duration (${error instanceof Error ? error.message : "unknown"})`); }
    if (music) try { if (track.vocalStartMs >= await readDuration(music)) errors.push(`${track.id}: vocalStartMs must be inside the music clip`); } catch (error) { errors.push(`${track.id}: cannot read music duration (${error instanceof Error ? error.message : "unknown"})`); }
  }
  if (clean(options.licensesText) !== clean(renderAssetLicenses(catalog))) errors.push("ASSET-LICENSES.md is out of date");
  return errors;
}

const root = resolve(import.meta.dirname, "../..");
const release = process.argv.includes("--release");
const licensesText = await readFile(resolve(root, "ASSET-LICENSES.md"), "utf8").catch(() => "");
const errors = await validateShowcase(showcaseCatalog, { publicDir: resolve(root, "public"), licensesText, minTracks: release ? 5 : 1, rejectPlaceholder: release });
if (errors.length) { for (const error of errors) console.error(`ERROR ${error}`); process.exitCode = 1; } else console.log(`Showcase catalog valid (${showcaseCatalog.length} track${showcaseCatalog.length === 1 ? "" : "s"}).`);
