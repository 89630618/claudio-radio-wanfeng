import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("new DJ voice starts its transcript progress at zero without coloring the meter by playback", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /setVoiceCurrentTime\(0\);\s*setVoiceDuration\(0\);\s*setIsVoicePlaying\(false\);\s*\n\s*const updateTime/);
  assert.match(source, /<div className={`voice-wave \$\{isSongWaveActive \? "active" : ""\}`} aria-hidden="true">/);
  assert.doesNotMatch(source, /className=\{index \/ 91 <= voiceProgress/);
});

test("voice control follows the voice audio element instead of the narration request state", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /const isVoiceActive = isVoicePlaying;/);
});
