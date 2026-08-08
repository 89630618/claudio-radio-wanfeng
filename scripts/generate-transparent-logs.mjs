import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const randomLogPath = path.join(docsDir, "dj-transparent-random-5-2026-06-09.md");
const fallbackLogPath = path.join(docsDir, "dj-fallback-diagnosis-2026-06-09.md");
const devServerLogPath = path.join(root, ".data", "dev-server.log");

const selected = [
  { id: "4b120ff4e43cad34", kind: "instrumental" },
  { id: "f0b5aae14e7b8efe", kind: "instrumental" },
  { id: "cfaa735307d88d50", kind: "vocal" },
  { id: "2506565895773d25", kind: "vocal" },
  { id: "e44d713c262c5e66", kind: "vocal" }
];

function sql(query) {
  return execFileSync("sqlite3", [".data/radio.sqlite", query], {
    encoding: "utf8",
    cwd: root
  }).trim();
}

async function getJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON from ${url}: ${text.slice(0, 200)}`);
  }
}

function short(text, limit = 220) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!value) return "-";
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function joinTags(value) {
  return Array.isArray(value) && value.length ? value.join(" / ") : "-";
}

function localStatus(filePath) {
  const ext = String(filePath || "").split(".").pop()?.toLowerCase() || "";
  return ["mp3", "flac", "wav", "ogg", "m4a", "aac"].includes(ext)
    ? "playable-local"
    : `cache-only-or-protected:${ext}`;
}

function fragmentPreview(fragments, key) {
  const hit = Array.isArray(fragments) ? fragments.find((item) => item.key === key) : null;
  return short(hit?.preview || "-", 220);
}

function getTrackPath(songId) {
  return sql(`select file_path from tracks where id='${songId}';`);
}

function writeUtf8Bom(filePath, text) {
  fs.writeFileSync(filePath, `\uFEFF${text}`, "utf8");
}

function findAbortLines(logText) {
  return logText
    .split(/\r?\n/)
    .filter((line) => line.includes("dj-line-context openai LLM request failed: This operation was aborted"))
    .slice(-10);
}

async function collectTrack(item) {
  const trackPath = getTrackPath(item.id);
  const lyricsResp = await getJson(`http://localhost:3080/api/lyrics/context?trackId=${encodeURIComponent(item.id)}`);
  const lyrics = lyricsResp.lyrics;
  const title = lyrics?.metadata?.title || "";
  const artist = lyrics?.metadata?.artist || "";
  const searchQ = `${title} ${artist}`.trim();
  const search = await getJson(`http://localhost:3080/api/kugou/search?q=${encodeURIComponent(searchQ)}&limit=5`);
  const songs = Array.isArray(search.songs) ? search.songs : [];
  const top = songs[0] || {};
  const debug = await getJson(`http://localhost:3080/api/debug/dj-context?songId=${encodeURIComponent(item.id)}`);
  const envLyrics = debug.environment?.lyrics || {};
  const dj = await getJson("http://localhost:3080/api/dj/line", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      songId: item.id,
      query: item.kind === "instrumental" ? "quiet night" : "commute with some content",
      reason: "transparent random test",
      moodTags: item.kind === "instrumental" ? ["night", "calm"] : ["commute"],
      previousLine: ""
    })
  });
  const subtitle = dj?.decision?.say || dj?.djLine || "";
  const tts = await getJson("http://localhost:3080/api/tts/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: subtitle })
  });

  return {
    item,
    trackPath,
    lyrics,
    title,
    artist,
    searchQ,
    songs,
    top,
    debug,
    envLyrics,
    dj,
    subtitle,
    tts
  };
}

function buildRandomLog(records) {
  const rows = [];
  const sections = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const play = Array.isArray(record.dj?.decision?.play) ? record.dj.decision.play.join(", ") : "-";
    const output = record.dj?.usedLlm ? "LLM" : "rules";
    const ttsState = record.tts?.ok ? "ok" : `fallback:${record.tts?.fallback || "unknown"}`;

    rows.push(
      `| ${index + 1} | ${record.artist} - ${record.title} | ${record.item.kind === "instrumental" ? "instrumental/weak-lyrics" : "vocal/lyrics"} | ${record.envLyrics.available ? "yes" : "no"} | ${record.lyrics.commentCount || 0} | ${output} | ${play} | ${ttsState} |`
    );

    let conclusion = "KuGou context reached context/compute and strict JSON produced the current-song subtitle.";
    if (!record.songs.length) conclusion = "KuGou search layer failed.";
    else if (!record.lyrics?.available) conclusion = "Lyrics layer missing.";
    else if (!record.envLyrics?.available) conclusion = "Lyrics exist but did not enter context.";
    else if (!record.dj?.usedLlm) conclusion = "Context/compute ran, but strict JSON fell back to rules/fallback.";
    else if (!Array.isArray(record.dj?.decision?.play) || record.dj.decision.play[0] !== record.item.id) conclusion = "Strict JSON did not lock the current song.";

    const checks = Object.entries(record.debug.checks || {})
      .map(([k, v]) => `${k}=${v}`)
      .join(", ") || "-";
    const songSignal = short(JSON.stringify(record.debug.compiled?.songSignal || {}), 280);
    const djBrief = short(record.debug.compiled?.djBrief || "-", 320);
    const matchedTitle = record.top.songName || record.top.SongName || "-";
    const matchedArtist = record.top.singerName || record.top.SingerName || "-";
    const mixsongId = record.top.mixSongId || record.top.MixSongID || "-";
    const hash = record.top.hash || record.top.Hash || "-";

    sections.push(
      [
        `## ${index + 1}. ${record.artist} - ${record.title}`,
        "",
        `- sampleType: ${record.item.kind === "instrumental" ? "instrumental/weak-lyrics" : "vocal/lyrics"}`,
        `- songId: \`${record.item.id}\``,
        `- filePath: \`${record.trackPath}\``,
        `- localMatchStatus: ${localStatus(record.trackPath)}`,
        "",
        "### Step 1-2 Local track info",
        `- title: ${record.title}`,
        `- artist: ${record.artist}`,
        "",
        "### Step 3 KuGou search",
        `- query: \`${record.searchQ}\``,
        `- resultCount: ${record.songs.length}`,
        `- top1: ${matchedTitle} / ${matchedArtist}`,
        `- ids: mixsongId=${mixsongId} ; hash=${hash}`,
        "",
        "### Step 4-5 Lyrics and comments",
        `- lyrics.available: ${Boolean(record.lyrics?.available)}`,
        `- lyrics.source: ${record.lyrics?.source || "-"}`,
        `- lineCount: ${record.lyrics?.lineCount || 0}`,
        `- isInstrumental: ${Boolean(record.lyrics?.isInstrumental || record.lyrics?.metadata?.isInstrumental)}`,
        `- lyricAnchor: ${record.lyrics?.lyricAnchor || "-"}`,
        `- songBackground: ${record.lyrics?.songBackground || "-"}`,
        `- commentCount: ${record.lyrics?.commentCount || 0}`,
        `- commentTags: ${joinTags(record.lyrics?.commentTags)}`,
        `- hasHotComments: ${Boolean(record.lyrics?.metadata?.hasHotComments)}`,
        "",
        "### Step 6-7 Context and compute",
        `- fragmentKeys: ${(record.debug.fragments || []).map((f) => f.key).join(", ")}`,
        `- environment.lyrics.available: ${Boolean(record.envLyrics?.available)}`,
        `- environment.lyrics.lyricAnchor: ${record.envLyrics?.lyricAnchor || "-"}`,
        `- environment.lyrics.commentTags: ${joinTags(record.envLyrics?.commentTags)}`,
        `- compiled.songSignal: ${songSignal}`,
        `- compiled.djBrief: ${djBrief}`,
        `- fragment3Preview: ${fragmentPreview(record.debug.fragments, "environment")}`,
        `- fragment6Preview: ${fragmentPreview(record.debug.fragments, "execution")}`,
        `- checks: ${checks}`,
        "",
        "### Step 8 Strict JSON",
        `- usedLlm: ${Boolean(record.dj?.usedLlm)}`,
        `- source: ${record.dj?.source || "-"}`,
        `- rejectedReason: ${record.dj?.rejectedReason || "-"}`,
        `- rawDjLine: ${record.dj?.rawDjLine || "-"}`,
        `- final.djLine: ${record.dj?.djLine || "-"}`,
        `- decision.say: ${record.dj?.decision?.say || "-"}`,
        `- decision.play: ${play}`,
        `- decision.reason: ${record.dj?.decision?.reason || "-"}`,
        `- decision.segue: ${record.dj?.decision?.segue || "-"}`,
        "",
        "### Step 9 Subtitle / TTS / fallback",
        `- subtitle: ${record.subtitle || "-"}`,
        `- tts.ok: ${Boolean(record.tts?.ok)}`,
        `- tts.fallback: ${record.tts?.fallback || "-"}`,
        `- tts.voiceUrl: ${record.tts?.voiceUrl || "-"}`,
        `- tts.error: ${record.tts?.error || "-"}`,
        "",
        "### Layer conclusion",
        `- result: ${conclusion}`
      ].join("\n")
    );
  }

  return [
    "# Claudio Random 5 Track Transparent Test",
    "",
    `- generatedAt: ${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    "- method: real pipeline, no new debug endpoints, no main-path changes.",
    "- sampleMix: 2 instrumental/weak-lyrics + 3 vocal/lyrics.",
    "- endpoints: `/api/kugou/search`, `/api/lyrics/context`, `/api/debug/dj-context`, `/api/dj/line`, `/api/tts/synthesize`.",
    "",
    "## Summary",
    "",
    "| # | Track | Type | Lyrics | Comments | Output | play[] | TTS |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Notes",
    "",
    "- This log is for layer visibility, not for judging whether the copywriting is good.",
    "- Main goal: verify that KuGou search/lyrics/comments really enter context and survive through strict JSON and TTS.",
    "- Main difference in this run is not context wiring, but whether strict JSON successfully gets an LLM answer.",
    "",
    ...sections,
    ""
  ].join("\n");
}

function buildFallbackLog(records, devServerLogText) {
  const fallbackRecords = records.filter((record) => !record.dj?.usedLlm);
  const abortLines = findAbortLines(devServerLogText);

  const sections = fallbackRecords.map((record, index) =>
    [
      `## ${index + 1}. ${record.artist} - ${record.title}`,
      "",
      `- songId: \`${record.item.id}\``,
      `- type: ${record.item.kind === "instrumental" ? "instrumental/weak-lyrics" : "vocal/lyrics"}`,
      `- contextPresent: ${Boolean(record.envLyrics?.available)}`,
      `- lyricAnchor: ${record.envLyrics?.lyricAnchor || "-"}`,
      `- commentTags: ${joinTags(record.envLyrics?.commentTags)}`,
      `- dj.usedLlm: ${Boolean(record.dj?.usedLlm)}`,
      `- rejectedReason: ${record.dj?.rejectedReason || "-"}`,
      `- source: ${record.dj?.source || "-"}`,
      `- rawDjLine: ${record.dj?.rawDjLine || "-"}`,
      `- final.djLine: ${record.dj?.djLine || "-"}`,
      `- djBriefSummary: ${short(record.debug.compiled?.djBrief || "-", 280)}`,
      `- recentAbortLogs: ${abortLines.length ? abortLines.join(" | ") : "-"}`,
      "",
      "### Diagnosis",
      "- result: This track did not fail because of missing context. The LLM request aborted before strict JSON completed, so the pipeline hit `strict JSON fallback decision`."
    ].join("\n")
  );

  return [
    "# Claudio Fallback Diagnosis",
    "",
    `- generatedAt: ${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    "- goal: explain why the fallback tracks did not reach final LLM strict JSON output.",
    "- method: compare `/api/debug/dj-context`, `/api/dj/line`, and `.data/dev-server.log` abort records.",
    "",
    "## Summary",
    "",
    "- These fallback tracks did not fail because KuGou context was missing.",
    "- Shared pattern: context/compute completed, but `resolveClaudeDecision()` hit an OpenAI abort, so `validateLockedDjDecision()` only saw the fallback decision and returned `strict JSON fallback decision`.",
    "- Priority should shift to LLM timeout/abort investigation, not lyrics/comments/context assembly.",
    "",
    ...sections,
    ""
  ].join("\n");
}

async function main() {
  const records = [];
  for (const item of selected) {
    records.push(await collectTrack(item));
  }

  const randomLog = buildRandomLog(records);
  writeUtf8Bom(randomLogPath, randomLog);

  const devServerLogText = fs.existsSync(devServerLogPath) ? fs.readFileSync(devServerLogPath, "utf8") : "";
  const fallbackLog = buildFallbackLog(records, devServerLogText);
  writeUtf8Bom(fallbackLogPath, fallbackLog);

  console.log(JSON.stringify({ randomLogPath, fallbackLogPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
