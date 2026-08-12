import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("playlist and transport changes prime playback before awaiting a new track", async () => {
  const source = await readFile(new URL("./App.tsx", import.meta.url), "utf8");

  assert.match(source, /const handleNext = useCallback\(async[\s\S]*?primeTrackAudio\(\);[\s\S]*?await getNextPick/);
  assert.match(source, /async function handlePlaylistSelect[\s\S]*?primeTrackAudio\(\);[\s\S]*?await hydrateAndPlayPick/);
});

test("DJ narration remains visible when Fish TTS fails", async () => {
  const source = await readFile(new URL("./App.tsx", import.meta.url), "utf8");

  assert.match(source, /setDjLine\(result\.djLine\);[\s\S]*?const voiceResult = await synthesizeDjVoice\(result\.djLine\);/);
  assert.match(source, /if \(!voiceResult\.ok\) \{\s*setNowPlayingDj\(\{ songId: pick\.songId, say: result\.djLine, voiceUrl: "", source: "ai", status: "voice_failed" \}\);/);
});

test("narration state machine controls the Player DJ audio element", async () => {
  const source = await readFile(new URL("./App.tsx", import.meta.url), "utf8");

  assert.match(source, /const voice = djVoiceAudioRef\.current;/);
  assert.match(source, /voice\.playbackRate = 0\.86;/);
  assert.match(source, /voice\.onended = \(\) => finish\(true\);/);
  assert.match(source, /void voice\.play\(\)\.catch\(\(\) => finish\(false\)\);/);
  assert.doesNotMatch(source, /speakAudioUrl\(nowPlayingDj\.voiceUrl\)/);
});

test("failed prepared narration falls back to a direct DJ request", async () => {
  const source = await readFile(new URL("./App.tsx", import.meta.url), "utf8");

  assert.match(source, /pendingPrepared\.promise\.then\(async \(result\) => \{\s*if \(djLineRunRef\.current !== runId\) return;\s*if \(!result\) \{\s*await requestAiDjLine\(pick, options\.scene \?\? ""\);/);
});

test("track playback source is controlled by the player hook alone", async () => {
  const source = await readFile(new URL("./components/AudioPlayer.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /streamUrl/);
  assert.doesNotMatch(source, /\bsrc=/);
});

test("DJ voice ducks and restores music volume with a short fade", async () => {
  const source = await readFile(new URL("./App.tsx", import.meta.url), "utf8");

  assert.match(source, /const duckedVolume = volume \* 0\.25;/);
  assert.match(source, /const fadeDuration = isSpeaking \? 280 : 900;/);
  assert.match(source, /window\.requestAnimationFrame\(fade\)/);
  assert.match(source, /window\.cancelAnimationFrame\(frame\);/);
  assert.match(source, /djVoiceAudioRef\.current\.volume = 1;/);
});

test("manual song requests keep an active playlist and its remaining queue", async () => {
  const source = await readFile(new URL("./App.tsx", import.meta.url), "utf8");

  assert.match(source, /function insertPickIntoPlaylist\(/);
  assert.match(source, /if \(activePlaylist && currentTrack && isPlaying\) \{[\s\S]*?insertPickIntoPlaylist/);
  assert.match(source, /else \{\s*setRadioQueue\(\[\]\);\s*setActivePlaylist\(null\);/);
});
