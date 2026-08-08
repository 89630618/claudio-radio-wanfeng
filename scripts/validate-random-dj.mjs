import { writeFileSync } from "node:fs";
import { getCalendarContext } from "../server/calendar.js";
import { getTracks } from "../server/db.js";
import { buildDjBriefWithTitleSignal } from "../server/dj-brief.js";
import { generateDjLine } from "../server/dj.js";
import { invalidContextDjLineReason } from "../server/dj-validator.js";
import { getLyricsContext } from "../server/lyrics.js";
import { getWeatherContext, sanitizeWeatherForDj } from "../server/weather.js";

const allTracks = getTracks(5000).filter((track) => track.playable);
if (allTracks.length < 5) throw new Error(`Need at least 5 playable tracks, got ${allTracks.length}`);

const seed = Number(process.env.DJ_RANDOM_SEED ?? Date.now());
let state = seed % 2147483647;
function rand() {
  state = (state * 48271) % 2147483647;
  return state / 2147483647;
}

function pickRandomTracks(count) {
  const pool = [...allTracks];
  const selected = [];
  while (selected.length < count && pool.length > 0) {
    const index = Math.floor(rand() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected;
}

function fieldFromBrief(brief, field) {
  const match = brief.match(new RegExp(`- ${field}: ([^\\n]+)`));
  return match?.[1]?.trim() ?? "";
}

function firstSentenceOf(line) {
  return (line.split(/[。！？!?\n]/).find(Boolean) || line).trim();
}

function sentenceCount(line) {
  const punctuationCount = (line.match(/[。！？!?]/g) || []).length;
  const lineCount = line.split(/\n+/).map((item) => item.trim()).filter(Boolean).length;
  return Math.max(punctuationCount, lineCount);
}

function charCount(line) {
  return Array.from(line.replace(/\s+/g, "")).length;
}

function openingFamily(line) {
  const first = firstSentenceOf(line);
  if (/^(不急着|不用急着|别急着|我不会|我不打算|这首我)/.test(first)) return "restraint_meta";
  if (/^(到|这个|十一|十二|凌晨|晚上|深夜|现在|这会儿)/.test(first)) return "time_state";
  if (/有人|评论|写/.test(first)) return "quote_or_comment";
  if (/[？?]/.test(first) || /^(你会不会|你也会|你刚才是不是|有没有|会不会)/.test(first)) return "question";
  if (/^(手机|耳机线|杯子|屏幕|灯|口袋|那样东西|手指|指尖|一句话)/.test(first)) return "small_object";
  if (/^(有时候|一个人|人会|人有时候|走到|翻到|摸到|盯着|拿着|关掉|刚关掉)/.test(first)) return "human_action";
  if (/《.*》/.test(first)) return "track_report";
  return "other";
}

function continuityNote(line, sceneCore) {
  const first = sceneCore.slice(0, 4);
  if (first && line.includes(first)) return "sceneCore phrase appears directly";
  if (/手|消息|屏幕|照片|杯子|手机|脚步|页面|灯|口袋|一句话/.test(sceneCore)) {
    return "manual check: concrete scene object should carry through";
  }
  return "manual check";
}

const selected = pickRandomTracks(5);
const recentLines = [];
const rows = [];
const weather = sanitizeWeatherForDj(await getWeatherContext());
const calendar = getCalendarContext();

for (let index = 0; index < selected.length; index += 1) {
  const track = selected[index];
  const lyrics = await getLyricsContext(track);
  const brief = await buildDjBriefWithTitleSignal({
    track,
    recentLines,
    weather,
    calendar,
    lyrics,
    query: "private night radio random validation",
    reason: `random validation ${index + 1}`,
    moodTags: ["random-validation", index % 2 ? "focus" : "night"]
  });

  const result = await generateDjLine({
    songId: track.id,
    query: "private night radio random validation",
    reason: `random validation ${index + 1}`,
    moodTags: ["random-validation", index % 2 ? "focus" : "night"],
    previousLine: recentLines[0] || "",
    lineMode: "plain_note",
    recentLinesOverride: recentLines,
    dryRun: true
  });

  const firstSentence = firstSentenceOf(result.djLine);
  const invalidReason = invalidContextDjLineReason(result.djLine, track);
  const sceneCore = fieldFromBrief(brief, "sceneCore");
  const sceneCoreSource = fieldFromBrief(brief, "sceneCoreSource");
  const titleSignalSource = fieldFromBrief(brief, "titleSignalSource");
  const titleSignals = fieldFromBrief(brief, "titleSignals");
  const titleEchoMode = fieldFromBrief(brief, "titleEchoMode");
  const titleInterpretationPolicy = fieldFromBrief(brief, "titleInterpretationPolicy");
  const row = {
    index: index + 1,
    track: `${track.artist || "-"} - ${track.title || "-"}`,
    usedLlm: result.usedLlm,
    source: result.source,
    rejectedReason: result.rejectedReason || "",
    invalidReason,
    firstSentence,
    openingFamily: openingFamily(result.djLine),
    sentenceCount: sentenceCount(result.djLine),
    charCount: charCount(result.djLine),
    sceneCore,
    sceneCoreSource,
    titleSignalSource,
    titleSignals,
    titleEchoMode,
    titleInterpretationPolicy,
    titleEchoUsedNote:
      titleEchoMode && titleEchoMode !== "none"
        ? "manual check: title echo should appear as scene/action/structure, not title analysis"
        : "none",
    continuityNote: continuityNote(result.djLine, sceneCore),
    line: result.djLine
  };
  rows.push(row);
  recentLines.unshift(result.djLine);
}

const openingCounts = rows.reduce((acc, row) => {
  acc[row.openingFamily] = (acc[row.openingFamily] || 0) + 1;
  return acc;
}, {});

let markdown = "# Claudio Random 5 DJ Validation Log\n\n";
markdown += `- generatedAt: ${new Date().toLocaleString("zh-CN", { hour12: false })}\n`;
markdown += `- seed: ${seed}\n`;
markdown += "- method: direct generateDjLine dryRun with current local code\n\n";
markdown += "## Summary\n\n";
markdown += `- usedLlm: ${rows.filter((row) => row.usedLlm).length}/5\n`;
markdown += `- rejected: ${rows.filter((row) => row.rejectedReason).length}/5\n`;
markdown += `- invalidAfterReturn: ${rows.filter((row) => row.invalidReason).length}/5\n`;
markdown += `- openingFamilies: ${JSON.stringify(openingCounts)}\n\n`;
markdown += "| # | Track | usedLlm | rejectedReason | firstSentence | openingFamily | sceneCoreSource | titleSignalSource | titleEchoMode | titleSignals | sentences | chars |\n";
markdown += "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n";
for (const row of rows) {
  markdown += `| ${row.index} | ${row.track.replace(/\|/g, "/")} | ${row.usedLlm ? "yes" : "no"} | ${row.rejectedReason || "-"} | ${row.firstSentence.replace(/\|/g, "/")} | ${row.openingFamily} | ${row.sceneCoreSource || "-"} | ${row.titleSignalSource || "-"} | ${row.titleEchoMode || "-"} | ${(row.titleSignals || "-").replace(/\|/g, "/")} | ${row.sentenceCount} | ${row.charCount} |\n`;
}

markdown += "\n## Details\n\n";
for (const row of rows) {
  markdown += `### ${row.index}. ${row.track}\n\n`;
  markdown += `- usedLlm: ${row.usedLlm}\n`;
  markdown += `- source: ${row.source}\n`;
  markdown += `- rejectedReason: ${row.rejectedReason || "-"}\n`;
  markdown += `- invalidReason: ${row.invalidReason || "-"}\n`;
  markdown += `- firstSentence: ${row.firstSentence}\n`;
  markdown += `- openingFamily: ${row.openingFamily}\n`;
  markdown += `- sceneCoreSource: ${row.sceneCoreSource || "-"}\n`;
  markdown += `- sceneCore: ${row.sceneCore || "-"}\n`;
  markdown += `- titleSignalSource: ${row.titleSignalSource || "-"}\n`;
  markdown += `- titleSignals: ${row.titleSignals || "-"}\n`;
  markdown += `- titleEchoMode: ${row.titleEchoMode || "-"}\n`;
  markdown += `- titleInterpretationPolicy: ${row.titleInterpretationPolicy || "-"}\n`;
  markdown += `- titleEchoUsedNote: ${row.titleEchoUsedNote}\n`;
  markdown += `- continuityNote: ${row.continuityNote}\n`;
  markdown += `- sentenceCount: ${row.sentenceCount}\n`;
  markdown += `- charCount: ${row.charCount}\n\n`;
  markdown += `\`\`\`text\n${row.line}\n\`\`\`\n\n`;
}

const path = `docs/dj-random-5-validation-${new Date().toISOString().slice(0, 10)}.md`;
writeFileSync(path, markdown, "utf8");
console.log(markdown);
console.error(`WROTE ${path}`);
