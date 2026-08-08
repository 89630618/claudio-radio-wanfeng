import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("playback source cache is renewed after the full-source policy changes", async () => {
  const source = await readFile(new URL("./playback-source.ts", import.meta.url), "utf8");

  assert.match(source, /"playback-source-cache-v2\.json"/);
  assert.doesNotMatch(source, /isTrialPlaybackSource/);
});
