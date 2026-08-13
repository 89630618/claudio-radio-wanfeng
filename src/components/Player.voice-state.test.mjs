import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("new DJ voice reads transcript progress from the real audio without coloring the meter by playback", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /setVoiceCurrentTime\(audio\.currentTime \|\| 0\);/);
  assert.match(source, /setVoiceDuration\(Number\.isFinite\(audio\.duration\) \? audio\.duration : 0\);/);
  assert.match(source, /<div className={`voice-wave \$\{isSongWaveActive \? "active" : ""\}`} aria-hidden="true">/);
  assert.doesNotMatch(source, /className=\{index \/ 91 <= voiceProgress/);
});

test("voice control follows the voice audio element with confirmed narration fallback", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /const isVoiceActive = isVoicePlaying \|\| isSpeaking;/);
});

test("transport DJ control pauses and resumes its audio without cancelling music", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /onClick=\{\(\) => void handleVoiceToggle\(\)\}/);
  assert.match(source, /title=\{isVoicePlaying \? "Pause DJ narration" : "Resume DJ narration"\}/);
});
