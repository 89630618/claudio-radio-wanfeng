import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("transcript renders a progress-driven span for every character", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /className="karaoke-char"/);
  assert.match(source, /"--character-progress"/);
  assert.doesNotMatch(source, /karaoke-line__fill/);
});

test("transcript keeps both read and unread characters legible on the listening card", async () => {
  const stylesheet = await readFile(new URL("./Player.transcript.css", import.meta.url), "utf8");

  assert.match(stylesheet, /#147f5b/);
  assert.match(stylesheet, /rgba\(36, 36, 38, 0\.58\)/);
});

test("active transcript line follows narration progress into view", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /activeTranscriptRef\.current\?\.scrollIntoView\(\{ block: "center", behavior: "smooth" \}\)/);
});

test("transcript keeps syncing from the real DJ audio while Showcase narration is active", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /const isVoiceActive = isVoicePlaying \|\| isSpeaking/);
  assert.match(source, /if \(!audio \|\| !isSpeaking \|\| audio\.paused \|\| audio\.ended\) return/);
  assert.match(source, /setVoiceCurrentTime\(audio\.currentTime \|\| 0\)/);
});

test("transcript observer never resets an already-playing DJ audio element", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /if \(!audio\) return;\s*setVoiceCurrentTime\(audio\.currentTime \|\| 0\);\s*audio\.currentTime = 0/);
});

test("mobile voice panel keeps the song progress control outside the transcript scroller", async () => {
  const stylesheet = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(stylesheet, /\.voice-panel \{[\s\S]*?display: flex;[\s\S]*?flex-direction: column;/);
  assert.match(stylesheet, /\.voice-card \{[\s\S]*?display: grid;[\s\S]*?grid-template-rows: auto auto auto minmax\(0, 1fr\) auto;/);
  assert.match(stylesheet, /\.voice-playback-row \{[\s\S]*?position: sticky;[\s\S]*?bottom: 0;/);
  assert.match(stylesheet, /@media \(max-width: 600px\)[\s\S]*?\.voice-panel-backdrop \{[\s\S]*?min-height: 100svh;/);
  assert.match(stylesheet, /\.voice-panel-motion,[\s\S]*?height: calc\(100svh - 24px - env\(safe-area-inset-top, 0px\) - env\(safe-area-inset-bottom, 0px\)\);/);
});

test("waiting transcript uses a compact Chinese placeholder", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /下一段串词正在准备中/);
  assert.doesNotMatch(source, /Claudio is preparing the next line/);
});
