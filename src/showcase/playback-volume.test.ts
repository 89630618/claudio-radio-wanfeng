import assert from "node:assert/strict";
import test from "node:test";

import { musicVolume, narrationVolume } from "./playback-volume";

test("music volume keeps the ducking ratio when the listener changes volume", () => {
  assert.equal(musicVolume(0.5, true), 0.36);
  assert.ok(Math.abs(musicVolume(0.8, true) - 0.576) < 0.0001);
  assert.equal(musicVolume(0.8, false), 0.8);
});

test("narration volume follows the listener volume in both narration modes", () => {
  assert.equal(narrationVolume(0.5, "intro_overlay"), 0.2);
  assert.equal(narrationVolume(0.5, "vocal_start", 0.3), 0.15);
  assert.ok(Math.abs(narrationVolume(0.8, "vocal_start", 0.4) - 0.32) < 0.0001);
});
