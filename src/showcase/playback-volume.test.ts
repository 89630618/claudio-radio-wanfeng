import assert from "node:assert/strict";
import test from "node:test";

import { musicVolume, narrationVolume } from "./playback-volume";

test("music volume keeps the ducking ratio when the listener changes volume", () => {
  assert.equal(musicVolume(0.5, true), 0.36);
  assert.ok(Math.abs(musicVolume(0.8, true) - 0.576) < 0.0001);
  assert.equal(musicVolume(0.8, false), 0.8);
});

test("narration keeps its independent mode gain when the listener changes music volume", () => {
  assert.equal(narrationVolume(0.1, "intro_overlay"), 1);
  assert.equal(narrationVolume(0.8, "intro_overlay"), 1);
  assert.equal(narrationVolume(0.1, "vocal_start", 0.3), 0.3);
  assert.equal(narrationVolume(0.8, "vocal_start", 0.4), 0.4);
});
