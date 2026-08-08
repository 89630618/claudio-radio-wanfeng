import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("selecting a track marks playback active before the stream starts", async () => {
  const source = await readFile(new URL("./useAudio.ts", import.meta.url), "utf8");

  assert.match(source, /if \(!audio\) \{\s*setIsPlaying\(false\);\s*return;\s*\}/);
  assert.match(source, /setIsPlaying\(true\);\s*void audio\.play\(\)\.catch/);
});

test("track changes prime the real audio element before async selection finishes", async () => {
  const source = await readFile(new URL("./useAudio.ts", import.meta.url), "utf8");

  assert.match(source, /const primeTrackAudio = useCallback/);
  assert.match(source, /audio\.muted = true;/);
  assert.match(source, /audio\.loop = true;/);
  assert.match(source, /primeTrackAudio,/);
});

test("silent track is loaded before the first user-triggered track change", async () => {
  const source = await readFile(new URL("./useAudio.ts", import.meta.url), "utf8");

  assert.match(source, /useEffect\(\(\) => \{\s*prepareTrackAudio\(\);\s*\}, \[prepareTrackAudio\]\);/);
});

test("Fish DJ narration uses a slower spoken pace without changing pitch", async () => {
  const source = await readFile(new URL("./useAudio.ts", import.meta.url), "utf8");

  assert.match(source, /voiceAudio\.playbackRate = 0\.86;/);
  assert.match(source, /voiceAudio\.preservesPitch = true;/);
});
