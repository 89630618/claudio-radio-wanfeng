import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("KuGou playback prefers the signed-in source and does not request free previews", async () => {
  const source = await readFile(new URL("./kugou.ts", import.meta.url), "utf8");

  assert.match(source, /const authModes = readSession\(\) \? \[true, false\] : \[false\];/);
  assert.doesNotMatch(source, /free_part:\s*1/);
  assert.doesNotMatch(source, /function isTrialPlaybackUrl/);
});
