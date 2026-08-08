import fs from "node:fs/promises";
import path from "node:path";
import { resolveClaudeDecision } from "../claude.js";
import { getTrack } from "../db.js";
import { buildLockedDjFallbackDecision } from "../dj-contract.js";
import { invalidContextDjLineReason } from "../dj-validator.js";
import { callLlmText, extractJson, hasLlm } from "../llm.js";
import type { ContextAssembly, Track } from "../types.js";

type FewShot = { id: number; title: string; body: string };

const sampleIds = [
  "kg-1743469fb1af7602",
  "b88e422c57b2d047",
  "kg-761a6539329e7f7e",
  "kg-e46b013f7b3ecbe9",
  "kg-755a44f4a163c39f"
];
const personaPath = path.resolve(process.cwd(), "prompts", "dj-persona.md");
const fewShotPath = path.resolve(process.cwd(), "prompts", "dj-fewshot.md");
const startedAt = Date.now();
const [persona, fewShots] = await Promise.all([readPersona(), readFewShots()]);
let failed = false;

for (const [index, songId] of sampleIds.entries()) {
  const track = getTrack(songId);
  const itemStartedAt = Date.now();
  if (!track) {
    failed = true;
    console.log(JSON.stringify({ kind: "fewShotSelectedDjLine", index: index + 1, songId, generationError: "track not found" }));
    continue;
  }

  try {
    const selected = await selectFewShots(track, fewShots);
    const context = buildWritingContext(track, persona, selected);
    const fallbackDecision = buildLockedDjFallbackDecision({ track, say: "", selectionReason: "few-shot selection experiment" });
    const decision = await resolveClaudeDecision({
      context,
      candidateIds: [track.id],
      fallbackDecision,
      preferredCount: 1,
      label: "dj-fewshot-selected-five",
      sayInstruction: "say is the requested Chinese radio voice line.",
      temperature: 0.7,
      minimalExecutionContract: true,
      musicKnowledgeMode: "model-first"
    });
    const line = decision.say.trim();
    const invalidReason = invalidContextDjLineReason(line, track);
    const usedLlm = decision !== fallbackDecision;
    const technicalFailure = !usedLlm || Boolean(invalidReason);
    failed ||= technicalFailure;
    console.log(JSON.stringify({
      kind: "fewShotSelectedDjLine",
      index: index + 1,
      total: sampleIds.length,
      track: { id: track.id, artist: track.artist, title: track.title, album: track.album },
      selectedFewShots: selected.map((sample) => ({ id: sample.id, title: sample.title })),
      input: {
        selector: "model-selected 2-3 positive few-shot originals",
        system: persona,
        user: formatSong(track),
        messageCount: context.messages.length
      },
      usedLlm,
      lockedSongId: decision.play[0] ?? "",
      rejectedReason: invalidReason ?? "",
      elapsedMs: Date.now() - itemStartedAt,
      line
    }));
  } catch (error) {
    failed = true;
    console.log(JSON.stringify({
      kind: "fewShotSelectedDjLine",
      index: index + 1,
      total: sampleIds.length,
      track: { id: track.id, artist: track.artist, title: track.title, album: track.album },
      generationError: error instanceof Error ? error.message : "generation failed"
    }));
  }
}

console.log(JSON.stringify({
  kind: "fewShotSelectedDjLineSummary",
  total: sampleIds.length,
  expectsLlm: hasLlm(),
  modelCalls: sampleIds.length * 2,
  path: "selector model -> 2-3 positive originals -> model-first writer",
  elapsedMs: Date.now() - startedAt,
  failed
}));

if (failed) process.exitCode = 1;

async function readPersona() {
  return (await fs.readFile(personaPath, "utf8")).trim();
}

async function readFewShots(): Promise<FewShot[]> {
  const content = await fs.readFile(fewShotPath, "utf8");
  return content
    .split(/(?=^### \[歌曲：)/mu)
    .map((section, index) => {
      const match = section.match(/^### \[歌曲：(.+?)\]\s*\n([\s\S]*)$/mu);
      return match
        ? {
            id: index,
            title: match[1].trim(),
            body: match[2].split(/^\s*-?(?:why|rejected)：.*$/mu)[0].trim()
          }
        : undefined;
    })
    .filter((sample): sample is FewShot => Boolean(sample))
    .filter((sample) => sample.body);
}

async function selectFewShots(track: Track, candidates: FewShot[]) {
  const candidateText = candidates.map((sample) => `[${sample.id}] ${sample.title}\n${sample.body}`).join("\n\n");
  const messages = [
    {
      role: "system",
      content: "你只负责为电台串词挑选参考范式，不写串词。请根据当前歌曲，选择最适合帮助本次创作的 2-3 条范式。只返回严格 JSON：{\"selected\":[编号]}。"
    },
    { role: "user", content: `${formatSong(track)}\n\n范式：\n${candidateText}` }
  ] satisfies ContextAssembly["messages"];
  const text = await callLlmText(messages, "dj-fewshot-selector", {
    responseFormat: "json_object",
    temperature: 0.2,
    timeoutMs: 20000
  });
  let selectedIds = text ? parseSelectedIds(text, candidates) : [];
  if (selectedIds.length < 2) {
    const retry = await callLlmText([
      ...messages,
      { role: "user", content: "请现在只返回 2-3 个有效范式编号的 JSON。" }
    ], "dj-fewshot-selector-retry", { responseFormat: "json_object", temperature: 0, timeoutMs: 20000 });
    selectedIds = retry ? parseSelectedIds(retry, candidates) : [];
  }
  if (selectedIds.length < 2) throw new Error("few-shot selector did not return 2-3 valid samples");
  return selectedIds.map((id) => candidates.find((candidate) => candidate.id === id)!).filter(Boolean);
}

function parseSelectedIds(text: string, candidates: FewShot[]) {
  try {
    const parsed = JSON.parse(extractJson(text)) as { selected?: unknown };
    const validIds = new Set(candidates.map((sample) => sample.id));
    return Array.isArray(parsed.selected)
      ? [...new Set(parsed.selected.map(Number).filter((id) => validIds.has(id)))].slice(0, 3)
      : [];
  } catch {
    return [];
  }
}

function buildWritingContext(track: Track, persona: string, selected: FewShot[]): ContextAssembly {
  const selectedOriginals = selected.map((sample) => `### [歌曲：${sample.title}]\n\n${sample.body}`).join("\n\n");
  const systemPrompt = `${persona}\n\n参考范式：\n${selectedOriginals}`;
  const userInputContext = formatSong(track);
  return {
    mode: "dj-line",
    systemPrompt,
    userCorpus: "",
    environmentContext: "",
    memoryContext: "",
    userInputContext,
    executionContext: "",
    fragments: [
      { key: "systemPrompt", title: "System Prompt", content: systemPrompt },
      { key: "userInputContext", title: "User Input", content: userInputContext }
    ],
    assembledPrompt: `${systemPrompt}\n\n${userInputContext}`,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInputContext }
    ]
  };
}

function formatSong(track: Track) {
  return `当前歌曲：${track.artist}《${track.title}》\n专辑：${track.album || "未知"}`;
}
