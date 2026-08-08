import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { localProgramFallback } from "./dj-fallback.js";
import { invalidProgramLineReason } from "./dj-validator.js";
import { callLlmText, extractJson, hasLlm } from "./llm.js";

export type ProgramLineType = "opening" | "interlude" | "closing";

export type ProgramLineInput = {
  type: ProgramLineType;
  scene?: string;
  recentTracks?: Array<{
    title?: string;
    artist?: string;
  }>;
  dryRun?: boolean;
};

export type ProgramLineResult = {
  type: ProgramLineType;
  line: string;
  source: "ai" | "rules";
  usedLlm: boolean;
  rejectedReason?: string;
  rawLine?: string;
};

type RawProgramLine = {
  line?: unknown;
};

const promptPath = path.resolve(process.cwd(), "prompts", "dj-persona.md");

async function readPersona() {
  try {
    return await fs.readFile(promptPath, "utf8");
  } catch {
    return [
      "你是 Claudio 的私人 AI 电台 DJ。",
      "中文表达克制、亲近、有审美，像深夜只对一个人说话。",
      "不要编造歌曲背景、真实天气或歌手故事。"
    ].join("\n");
  }
}

function programSceneHint(type: ProgramLineType, scene = "") {
  const sceneText = scene.toLowerCase();
  const sceneLine = /work|study|工作|学习|专注/.test(sceneText)
    ? "当前节目面向工作或学习场景：低打扰、不过度抒情。"
    : /sleep|睡前|夜晚|深夜/.test(sceneText)
      ? "当前节目偏睡前或夜间：更轻、更短，不制造兴奋感。"
      : "当前节目只保留轻量节目感，不写成广告文案或抒情散文。";

  if (type === "opening") return `${sceneLine} 这是开场白，只说明节目已经开始。`;
  if (type === "closing") return `${sceneLine} 这是收尾，只把节目收住，不做总结说教。`;
  return `${sceneLine} 这是中场旁白，只做短停顿，不额外铺陈。`;
}

function cleanLine(value: string) {
  return value
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .trim();
}

function parseProgramLine(text: string | undefined) {
  if (!text) return "";
  try {
    const parsed = JSON.parse(extractJson(text)) as RawProgramLine;
    return cleanLine(String(parsed.line ?? ""));
  } catch {
    return cleanLine(text);
  }
}

function buildProgramLineMessages(persona: string, input: ProgramLineInput, retryReason?: string) {
  const hardRules = [
    "当前任务只写节目感旁白，不选歌、不推荐歌单、不解释算法。",
    "输出中文，120-260 个汉字，2 到 5 句。",
    "风格保持自然，不用播报腔，不写成广告文案。",
    "可以有轻量节目感，但不要大量使用夜色、灯光、窗边等意象。",
    "不要声称真实天气或真实环境正在发生：例如正在下雨、外面下雪、今天气温。",
    "不要编造歌曲背景、歌手故事、歌词含义或历史事实。",
    "不要出现：欢迎收听、亲爱的听众、为您带来、本期节目、敬请欣赏。",
    "输出严格 JSON：{\"line\":\"...\"}"
  ];

  return [
    {
      role: "system" as const,
      content: [persona, "", "## Program Line Rules", ...hardRules, programSceneHint(input.type, input.scene)].join("\n")
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          type: input.type,
          scene: input.scene ?? "",
          recentTracks: input.recentTracks ?? [],
          retryReason: retryReason ?? ""
        },
        null,
        2
      )
    }
  ];
}

export async function generateProgramLine(input: ProgramLineInput): Promise<ProgramLineResult> {
  if (!hasLlm()) {
    return {
      type: input.type,
      line: localProgramFallback(input.type),
      source: "rules",
      usedLlm: false
    };
  }

  const persona = await readPersona();
  let lastInvalidReason = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const retryReason = attempt === 0 ? undefined : lastInvalidReason;
    let text: string | undefined;
    try {
      text = await callLlmText(buildProgramLineMessages(persona, input, retryReason), "dj-program-line", {
        responseFormat: "json_object",
        temperature: Math.max(0.8, config.djAiTemperature),
        model: config.djAiModel,
        timeoutMs: Math.max(config.djAiTimeoutMs, 12000),
        reasoningEffort: config.djAiReasoningEffort
      });
    } catch (error) {
      console.warn(`dj-program-line LLM failed: ${error instanceof Error ? error.message : error}`);
      break;
    }

    const line = parseProgramLine(text);
    lastInvalidReason = invalidProgramLineReason(line);
    if (!lastInvalidReason) {
      return {
        type: input.type,
        line,
        source: "ai",
        usedLlm: true,
        rawLine: line
      };
    }
  }

  return {
    type: input.type,
    line: localProgramFallback(input.type),
    source: "rules",
    usedLlm: false,
    rejectedReason: lastInvalidReason || undefined
  };
}
