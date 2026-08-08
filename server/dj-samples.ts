import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

export type DjSample = {
  id: string;
  text: string;
  why?: string;
  songId?: string;
  createdAt?: string;
};

type DjSamplesFile = {
  schema?: string;
  note?: string;
  approved?: DjSample[];
  rejected?: DjSample[];
};

export type DjSamples = {
  approved: DjSample[];
  rejected: DjSample[];
};

const samplesPath = path.join(config.userProfileDir, "dj-samples.json");
export const djSamplesPath = samplesPath;
const maxStoredSamplesPerKind = 30;

function normalizeSample(sample: unknown): DjSample | null {
  if (!sample || typeof sample !== "object") return null;
  const item = sample as Partial<DjSample>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const text = typeof item.text === "string" ? item.text.trim() : "";
  const why = typeof item.why === "string" ? item.why.trim() : undefined;
  const songId = typeof item.songId === "string" ? item.songId.trim() : undefined;
  const createdAt = typeof item.createdAt === "string" ? item.createdAt.trim() : undefined;
  if (!id || !text) return null;
  return { id, text, why, songId, createdAt };
}

function normalizeList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeSample).filter((item): item is DjSample => Boolean(item)).slice(0, limit);
}

function emptySamplesFile(): DjSamplesFile {
  return {
    schema: "claudio.dj-samples.v1",
    note: "DJ 文案样本库。当前主链路使用干净基线启动，新的喜欢/不喜欢反馈会从这里重新积累。样本只进入 /api/dj/line 的 Memory 片段，不参与选歌。",
    approved: [],
    rejected: []
  };
}

export function readDjSamples(limitPerKind = 4): DjSamples {
  try {
    const parsed = JSON.parse(fs.readFileSync(samplesPath, "utf8")) as DjSamplesFile;
    return {
      approved: normalizeList(parsed.approved, limitPerKind),
      rejected: normalizeList(parsed.rejected, limitPerKind)
    };
  } catch (error) {
    console.warn(`DJ samples unavailable: ${error instanceof Error ? error.message : error}`);
    return { approved: [], rejected: [] };
  }
}

function readDjSamplesFile(): DjSamplesFile {
  try {
    return JSON.parse(fs.readFileSync(samplesPath, "utf8")) as DjSamplesFile;
  } catch {
    return emptySamplesFile();
  }
}

function writeDjSamplesFile(file: DjSamplesFile) {
  fs.mkdirSync(path.dirname(samplesPath), { recursive: true });
  fs.writeFileSync(samplesPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export function resetDjSamplesFile() {
  const next = emptySamplesFile();
  writeDjSamplesFile(next);
  return next;
}

function sampleId(kind: "approved" | "rejected") {
  return `${kind}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function appendDjSample(
  kind: "approved" | "rejected",
  input: { text: string; songId?: string; reason?: string }
): DjSample {
  const text = input.text.trim();
  if (text.length < 4) {
    throw new Error("DJ sample text is too short");
  }

  const file = readDjSamplesFile();
  const approved = normalizeList(file.approved, maxStoredSamplesPerKind);
  const rejected = normalizeList(file.rejected, maxStoredSamplesPerKind);
  const target = kind === "approved" ? approved : rejected;
  const other = kind === "approved" ? rejected : approved;
  const withoutSameText = target.filter((sample) => sample.text !== text);
  const sample: DjSample = {
    id: sampleId(kind),
    text,
    why:
      input.reason?.trim() ||
      (kind === "approved" ? "用户标记喜欢这句，低权重作为风格参考。" : "用户标记不喜欢这句，高权重作为避雷样本。"),
    songId: input.songId?.trim() || undefined,
    createdAt: new Date().toISOString()
  };

  const nextTarget = [sample, ...withoutSameText].slice(0, maxStoredSamplesPerKind);
  const nextOther = other.filter((item) => item.text !== text).slice(0, maxStoredSamplesPerKind);
  const nextFile: DjSamplesFile = {
    schema: file.schema || "claudio.dj-samples.v1",
    note:
      file.note ||
      "DJ 文案样本库。当前主链路使用干净基线启动，新的喜欢/不喜欢反馈会从这里重新积累。样本只进入 /api/dj/line 的 Memory 片段，不参与选歌。",
    approved: kind === "approved" ? nextTarget : nextOther,
    rejected: kind === "rejected" ? nextTarget : nextOther
  };

  writeDjSamplesFile(nextFile);
  return sample;
}

export function formatDjSamplesForContext(samples = readDjSamples()) {
  const approved = samples.approved.map((sample) => `APPROVED ${sample.id}: ${sample.text}${sample.why ? ` | why: ${sample.why}` : ""}`);
  const rejected = samples.rejected.map((sample) => `REJECTED ${sample.id}: ${sample.text}${sample.why ? ` | why: ${sample.why}` : ""}`);
  return {
    approved,
    rejected,
    summary:
      approved.length || rejected.length
        ? [...approved, ...rejected].join("\n")
        : "No DJ approved/rejected examples available."
  };
}
