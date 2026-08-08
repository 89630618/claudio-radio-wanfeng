import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

test("voice input submits one final speech-recognition transcript", () => {
  assert.match(source, /let submitted = false/);
  assert.match(source, /result\?\.isFinal/);
  assert.match(source, /handleChatSubmit\(undefined, transcript\)/);
});

test("voice input can stop an active recognition run and times out cleanly", () => {
  assert.match(source, /recognition\?\.abort\(\)/);
  assert.match(source, /Voice input timed out/);
});

test("voice input can cancel while microphone permission is still pending", () => {
  assert.match(source, /const voiceInputActiveRef = useRef\(false\)/);
  assert.match(source, /if \(voiceInputActiveRef\.current\) \{[\s\S]*?recognition\?\.abort\(\)[\s\S]*?setIsListening\(false\)/);
});
