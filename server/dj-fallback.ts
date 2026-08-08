import { buildLockedDjFallbackDecision } from "./dj-contract.js";
import { invalidDjLineReason, normalizeOpening, type TrackLineMode } from "./dj-validator.js";
import type { ClaudeDecision, Track } from "./types.js";

type FallbackDjDecisionInput = {
  reason?: string;
  previousLine?: string;
};

const fallbackStates = [
  "这一段不用报得太重，先让名字轻轻落一下。后面的话留短一点，听感会更自然。",
  "如果前面已经说了不少，这里就换成更简单的入口。把歌放出来，人的注意力会自己靠近。",
  "这首不需要被介绍成一个大场面。确认过名字以后，就让它在这一小段时间里慢慢出现。",
  "这里先留一个普通的停顿。不是为了说明什么，只是让下一首歌有一个干净的落点。",
  "先从这个名字开始。剩下的部分说得松一点，让这一小段时间自己打开。"
];

function pickFallbackState(track: Track, recentLines: string[]) {
  const recentText = recentLines.slice(0, 8).join("\n");
  const seed = `${track.id}:${recentLines.length}`;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  for (let offset = 0; offset < fallbackStates.length; offset += 1) {
    const state = fallbackStates[(hash + offset) % fallbackStates.length];
    if (!recentText.includes(state)) return state;
  }
  return fallbackStates[0];
}

export function localFallbackLine(
  track: Track,
  _previousLine = "",
  mode: TrackLineMode = "direct_intro",
  recentLines: string[] = []
) {
  const title = track.title || "这一首";
  const artist = track.artist || "Claudio";
  const state = pickFallbackState(track, recentLines);
  const candidates = [
    `${state}\n${artist} 的《${title}》在这里出现。\n不额外加背景，只顺着这一段往下听。`,
    `${state}\n这里是《${title}》，${artist}。\n确认到这两个名字就够了，后面别把话说重。`,
    `${state}\n现在轮到 ${artist} 的《${title}》。\n话不用绕太远，把入口放干净就好。`
  ];

  return (
    candidates.find((line) => !recentLines.map(normalizeOpening).includes(normalizeOpening(line)) && !invalidDjLineReason(line, recentLines, track, mode)) ??
    candidates.find((line) => !invalidDjLineReason(line, [], track, mode)) ??
    `${artist}，《${title}》。`
  );
}

export function localProgramFallback(type: "opening" | "interlude" | "closing") {
  if (type === "closing") {
    return "今天先到这里。后面不再继续加新的旁白，这一轮节目在这里结束。剩下的时间继续留给当前的播放顺序。";
  }
  if (type === "interlude") {
    return "这里留一个短停顿，说明节目还在继续。下一段仍按当前队列往下走，不补背景，不额外展开，只保留必要过门。";
  }
  return "Claudio 开机了。今天按顺序放歌，每首歌前只保留一小段旁白，不讲背景，不改队列，节目从这里开始。";
}

export function buildFallbackDjDecision(
  track: Track,
  recentLines: string[],
  input: FallbackDjDecisionInput,
  lineMode: TrackLineMode
): ClaudeDecision {
  return buildLockedDjFallbackDecision({
    track,
    say: localFallbackLine(track, input.previousLine, lineMode, recentLines),
    selectionReason: input.reason,
    recentLineCount: recentLines.length
  });
}
