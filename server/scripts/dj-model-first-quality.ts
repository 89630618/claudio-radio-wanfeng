import fs from "node:fs/promises";
import path from "node:path";
import { getTracks, upsertTracks } from "../db.js";
import { generateModelFirstDjLine } from "../dj-model-first.js";
import { invalidContextDjLineReason } from "../dj-validator.js";
import { findExactKuGouApiTrack } from "../kugou-library.js";
import { hasLlm } from "../llm.js";
import type { Track } from "../types.js";

type QualitySample = { artist: string; title: string; category: string };

const startedAt = Date.now();
const qualitySamplesPath = path.resolve(process.cwd(), "server", "fixtures", "quality-samples.json");
const samples = await readSamples();
const tracks = await ensureQualityTracks(samples);
const expectsLlm = hasLlm();
const contextProfile = process.argv.includes("--minimal") ? "minimal" : "full";
let failed = false;

for (const [index, track] of tracks.entries()) {
  const sample = samples.find((item) => sameSong(track, item));
  const itemStartedAt = Date.now();
  try {
    const result = await generateModelFirstDjLine({
      track,
      contextProfile,
      query: "以私人电台主持人的身份，为当前歌曲写一段自然串词。"
    });
    const line = result.decision.say.trim();
    const invalidReason = invalidContextDjLineReason(line, track);
    const usedLlm = !result.usedFallbackDecision;
    const technicalFailure = !usedLlm || !line || Boolean(invalidReason);
    failed ||= technicalFailure;
    console.log(
      JSON.stringify({
        kind: "modelFirstTrackLine",
        index: index + 1,
        total: tracks.length,
        sampleCategory: sample?.category ?? "other",
        track: `${track.artist} - ${track.title}`,
        input: {
          contextProfile,
          songIdentity: `${track.artist} - ${track.title}`,
          album: track.album,
          contextWindows: result.context.fragments.filter((fragment) => fragment.content.trim()).map((fragment) => fragment.title),
          messageCount: result.context.messages.length,
          musicReferencesLoaded: false,
          environmentRole: "rhythm-and-pacing-only"
        },
        usedLlm,
        source: usedLlm ? "ai" : "fallback",
        invalidReason,
        elapsedMs: Date.now() - itemStartedAt,
        line
      })
    );
  } catch (error) {
    failed = true;
    console.log(
      JSON.stringify({
        kind: "modelFirstTrackLine",
        index: index + 1,
        total: tracks.length,
        sampleCategory: sample?.category ?? "other",
        track: `${track.artist} - ${track.title}`,
        usedLlm: false,
        source: "error",
        generationError: error instanceof Error ? error.message : "model-first generation failed",
        elapsedMs: Date.now() - itemStartedAt,
        line: ""
      })
    );
  }
}

const missingSamples = samples.filter((sample) => !tracks.some((track) => sameSong(track, sample)));
if (missingSamples.length > 0) failed = true;
console.log(
  JSON.stringify({
    kind: "modelFirstTrackLineSummary",
    total: tracks.length,
    elapsedMs: Date.now() - startedAt,
    expectsLlm,
    contextProfile,
    modelCalls: tracks.length,
    missingSamples: missingSamples.map((sample) => `${sample.artist} - ${sample.title}`),
    acceptance: "technical gates only; human review decides whether each line is broadcast-ready",
    failed
  })
);

if (failed) process.exitCode = 1;

async function readSamples(): Promise<QualitySample[]> {
  const parsed = JSON.parse(await fs.readFile(qualitySamplesPath, "utf8")) as { samples?: unknown };
  if (!Array.isArray(parsed.samples)) return [];
  return parsed.samples
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      artist: String(item.artist ?? "").trim(),
      title: String(item.title ?? "").trim(),
      category: String(item.category ?? "other").trim()
    }))
    .filter((item) => item.artist && item.title);
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function sameSong(track: Track, sample: Pick<QualitySample, "artist" | "title">) {
  const title = normalized(track.title);
  const artist = normalized(track.artist);
  return title.includes(normalized(sample.title)) || normalized(sample.title).includes(title)
    ? artist.includes(normalized(sample.artist)) || normalized(sample.artist).includes(artist)
    : false;
}

async function ensureQualityTracks(samplesToLoad: QualitySample[]) {
  const initial = getTracks(5000).filter((track) => track.playable);
  const missing = samplesToLoad.filter((sample) => !initial.some((track) => sameSong(track, sample)));
  if (missing.length > 0) {
    const fetched = await Promise.all(missing.map((sample) => findExactKuGouApiTrack(sample).catch(() => undefined)));
    const resolved = fetched.filter((track): track is Track => Boolean(track));
    if (resolved.length > 0) upsertTracks(resolved);
  }
  return samplesToLoad
    .map((sample) => getTracks(5000).filter((track) => track.playable).find((track) => sameSong(track, sample)))
    .filter((track): track is Track => Boolean(track));
}
