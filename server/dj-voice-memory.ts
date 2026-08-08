import { readDjSamples } from "./dj-samples.js";

function summarizeSampleCounts(approvedCount: number, rejectedCount: number) {
  if (approvedCount === 0 && rejectedCount === 0) {
    return "- 当前没有有效反馈样本，按基础边界执行。";
  }
  return `- 已有反馈：喜欢 ${approvedCount} 条，不喜欢 ${rejectedCount} 条。只用于避雷和弱统计，不把原句当模板。`;
}

export function buildDjVoiceMemory() {
  const samples = readDjSamples(30);

  return [
    "DJ Voice Preference Memory:",
    "",
    "Style direction:",
    "- 不喜欢的反馈权重大于喜欢的反馈，但都只提供方向，不规定句式。",
    "- 避免用歌名解释、默认听众场景、可替换的主持人收束或安全意象替代歌曲本身。",
    "- 不把喜欢或不喜欢的样本换歌名复写；原始样本不会进入 prompt。",
    "",
    "Recent user signal:",
    summarizeSampleCounts(samples.approved.length, samples.rejected.length),
    samples.approved.length > 0 || samples.rejected.length > 0
      ? "- 反馈只作为弱方向，模型仍从当前歌曲证据自行写作。"
      : "- 当前没有额外反馈，按歌曲证据自行写作。"
  ].join("\n");
}
