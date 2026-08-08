import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ordinary conversation skips the separate intent-model request", async () => {
  const source = await readFile(new URL("./chat.ts", import.meta.url), "utf8");

  assert.match(source, /function needsModelIntentClassification\(message: string\)/);
  assert.match(source, /const modelIntent = needsModelIntentClassification\(clean\) \? await classifyChatIntent\(clean\) : undefined;/);
});
