import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("positive DJ few-shots do not teach comment-section narration", async () => {
  const source = await readFile(new URL("./dj-fewshot.md", import.meta.url), "utf8");

  assert.doesNotMatch(source, /评论区|热评/);
});
