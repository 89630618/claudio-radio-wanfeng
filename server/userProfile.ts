import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { recordMemory } from "./db.js";
import { callLlmJson, getLastLlmProvider, hasLlm } from "./llm.js";

const userDir = config.userProfileDir;

const docFiles = {
  taste: path.join(userDir, "taste.md"),
  routines: path.join(userDir, "routines.md"),
  moodRules: path.join(userDir, "mood-rules.md"),
  interviews: path.join(userDir, "taste-interviews.md")
};

const initialDocs: Record<keyof typeof docFiles, string> = {
  taste: "# Taste Profile\n\n## 喜欢\n\n## 谨慎/不喜欢\n\n## 重要歌手/风格\n\n## 推荐注意事项\n",
  routines: "# Routines\n\n## 通勤\n\n## 工作/学习\n\n## 健身\n\n## 睡前\n\n## 周末/散步\n",
  moodRules: "# Mood Rules\n\n## 天气\n\n## 情绪\n\n## 场景到音乐的映射\n",
  interviews: "# Taste Interviews\n\n"
};

type ProfileUpdate = {
  tasteMarkdown?: string;
  routinesMarkdown?: string;
  moodRulesMarkdown?: string;
  memory?: string;
  nextQuestion?: string;
};

export async function ensureUserDocs() {
  await fs.mkdir(userDir, { recursive: true });
  for (const key of Object.keys(docFiles) as Array<keyof typeof docFiles>) {
    try {
      await fs.access(docFiles[key]);
    } catch {
      await fs.writeFile(docFiles[key], initialDocs[key], "utf8");
    }
  }
}

export async function getUserProfileDocs() {
  await ensureUserDocs();
  const [taste, routines, moodRules, interviews] = await Promise.all([
    fs.readFile(docFiles.taste, "utf8"),
    fs.readFile(docFiles.routines, "utf8"),
    fs.readFile(docFiles.moodRules, "utf8"),
    fs.readFile(docFiles.interviews, "utf8")
  ]);

  return {
    taste,
    routines,
    moodRules,
    interviews: interviews.slice(-6000)
  };
}

async function callAiForProfile(message: string, docs: Awaited<ReturnType<typeof getUserProfileDocs>>) {
  return callLlmJson<ProfileUpdate>(
    {
      role: "你是私人 AI 电台的品味档案整理员。你的任务是把用户自然语言回答沉淀成可执行的电台记忆。",
      userAnswer: message,
      currentDocs: {
        taste: docs.taste,
        routines: docs.routines,
        moodRules: docs.moodRules
      },
      output:
        "输出严格 JSON：tasteMarkdown、routinesMarkdown、moodRulesMarkdown、memory、nextQuestion。保留 Markdown 标题结构，合并新信息，不要丢失旧信息。memory 是一条最值得长期记住的话。nextQuestion 是下一步最该追问的问题。"
    },
    "taste-profile"
  );
}

function localProfileUpdate(message: string, docs: Awaited<ReturnType<typeof getUserProfileDocs>>): ProfileUpdate {
  const time = new Date().toLocaleString("zh-CN", { hour12: false });
  const line = `- ${time}：${message.trim()}`;
  const scene =
    /通勤|上班|地铁|开车/.test(message)
      ? "通勤"
      : /健身|跑步|运动/.test(message)
        ? "健身"
        : /工作|学习|写代码|专注/.test(message)
          ? "工作/学习"
          : /睡前|放松|夜晚/.test(message)
            ? "睡前"
            : "待归类";

  return {
    tasteMarkdown: `${docs.taste.trim()}\n\n## 新观察\n${line}\n`,
    routinesMarkdown: `${docs.routines.trim()}\n\n## ${scene}补充\n${line}\n`,
    moodRulesMarkdown: `${docs.moodRules.trim()}\n\n## 新规则线索\n${line}\n`,
    memory: message.trim().slice(0, 180),
    nextQuestion: "这个场景下，你更想要有人声、纯音乐，还是节奏感更强的歌？"
  };
}

export async function updateTasteProfile(message: string) {
  await ensureUserDocs();
  const clean = message.trim();
  if (!clean) throw new Error("训练内容不能为空。");

  const docs = await getUserProfileDocs();
  const time = new Date().toLocaleString("zh-CN", { hour12: false });
  await fs.appendFile(docFiles.interviews, `\n## ${time}\n\n${clean}\n`, "utf8");

  const aiUpdate = await callAiForProfile(clean, docs);
  const update = aiUpdate ?? localProfileUpdate(clean, docs);

  await Promise.all([
    fs.writeFile(docFiles.taste, update.tasteMarkdown || docs.taste, "utf8"),
    fs.writeFile(docFiles.routines, update.routinesMarkdown || docs.routines, "utf8"),
    fs.writeFile(docFiles.moodRules, update.moodRulesMarkdown || docs.moodRules, "utf8")
  ]);

  if (update.memory) {
    recordMemory(update.memory, hasLlm() ? `taste-training-${config.aiProvider}` : "taste-training-local");
  }

  return {
    ok: true,
    memory: update.memory || "",
    nextQuestion: update.nextQuestion || "再告诉我一个你最常听歌的生活场景。",
    docs: await getUserProfileDocs(),
    usedOpenAI: getLastLlmProvider() === "openai",
    usedAIProvider: aiUpdate ? getLastLlmProvider() || config.aiProvider : "local"
  };
}
