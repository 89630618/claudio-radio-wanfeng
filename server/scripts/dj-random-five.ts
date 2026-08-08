import { getTracks } from "../db.js";
import { generateDjLine } from "../dj.js";
import { hasLlm } from "../llm.js";

const count = 5;
const startedAt = Date.now();
const tracks = randomSample(
  getTracks(5000).filter((track) => track.playable && hasUsefulIdentity(track.artist, track.title)),
  count
);
let failed = tracks.length !== count;

for (const [index, track] of tracks.entries()) {
  const itemStartedAt = Date.now();
  try {
    const result = await generateDjLine({ songId: track.id, dryRun: true });
    const technicalFailure = !result.usedLlm || !result.decision || Boolean(result.rejectedReason);
    failed ||= technicalFailure;
    console.log(JSON.stringify({
      kind: "randomFormalDjLine",
      index: index + 1,
      total: count,
      track: { id: track.id, artist: track.artist, title: track.title, album: track.album },
      input: {
        system: ["prompts/dj-persona.md", "positive body from prompts/dj-fewshot.md"],
        user: `当前点播歌曲：${track.artist}《${track.title}》 / 专辑：${track.album || "未知"}`,
        contextWindows: ["System Prompt", "User Input"],
        musicReferencesLoaded: false
      },
      usedLlm: result.usedLlm,
      lockedSongId: result.decision?.play[0] ?? "",
      rejectedReason: result.rejectedReason ?? "",
      elapsedMs: Date.now() - itemStartedAt,
      line: result.djLine
    }));
  } catch (error) {
    failed = true;
    console.log(JSON.stringify({
      kind: "randomFormalDjLine",
      index: index + 1,
      total: count,
      track: { id: track.id, artist: track.artist, title: track.title, album: track.album },
      usedLlm: false,
      generationError: error instanceof Error ? error.message : "DJ generation failed",
      elapsedMs: Date.now() - itemStartedAt,
      line: ""
    }));
  }
}

console.log(JSON.stringify({
  kind: "randomFormalDjLineSummary",
  requestedCount: count,
  selectedCount: tracks.length,
  elapsedMs: Date.now() - startedAt,
  expectsLlm: hasLlm(),
  path: "generateDjLine -> generateModelFirstDjLine -> minimal context",
  acceptance: "technical gates passed; human review decides whether each line is broadcast-ready",
  failed
}));

if (failed) process.exitCode = 1;

function randomSample<T>(items: T[], size: number) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other]!, shuffled[index]!];
  }
  return shuffled.slice(0, size);
}

function hasUsefulIdentity(artist: string, title: string) {
  const identity = `${artist} ${title}`.trim().toLowerCase();
  return Boolean(identity) && !/unknown artist|^纯音乐$|^instrumental$/.test(identity);
}
