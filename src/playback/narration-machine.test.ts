import assert from "node:assert/strict";
import test from "node:test";
import { initialNarrationState, transitionNarration } from "./narration-machine";

test("vocal_start starts music at zero and starts narration at vocalStartMs", () => {
  const selected = transitionNarration(initialNarrationState, {
    type: "select",
    mode: "vocal_start",
    voiceReady: true,
    vocalStartMs: 2400,
  });

  assert.equal(selected.state.phase, "music_waiting_vocal");
  assert.deepEqual(selected.commands, [
    { type: "clear_voice_start" },
    { type: "stop_voice" },
    { type: "play_music", restart: true },
  ]);

  const started = transitionNarration(selected.state, { type: "progress", positionMs: 2400 });
  assert.equal(started.state.phase, "overlay");
  assert.deepEqual(started.commands, [
    { type: "duck_music" },
    { type: "play_voice", restart: true },
  ]);
});

test("vocal_start begins only when music naturally reaches the marked vocal", () => {
  const selected = transitionNarration(initialNarrationState, { type: "select", mode: "vocal_start", voiceReady: true, vocalStartMs: 2400 });
  const before = transitionNarration(selected.state, { type: "progress", positionMs: 2399 });
  const reached = transitionNarration(before.state, { type: "progress", positionMs: 2400 });
  assert.equal(before.state.phase, "music_waiting_vocal");
  assert.equal(reached.state.phase, "overlay");
});

test("vocal_start starts only on an exact seek and skips narration when seek passes the mark", () => {
  const selected = transitionNarration(initialNarrationState, { type: "select", mode: "vocal_start", voiceReady: true, vocalStartMs: 2400 });
  const past = transitionNarration(selected.state, { type: "seek", positionMs: 2401 });
  assert.equal(past.state.phase, "music");
  assert.deepEqual(past.commands, [{ type: "clear_voice_start" }, { type: "restore_music" }]);

  const exact = transitionNarration(selected.state, { type: "seek", positionMs: 2400 });
  assert.equal(exact.state.phase, "overlay");
});

test("intro_overlay starts music then starts narration after its configured lead-in", () => {
  const result = transitionNarration(initialNarrationState, {
    type: "select",
    mode: "intro_overlay",
    voiceReady: true,
    vocalStartMs: 3200,
    introDelayMs: 3000,
  });
  assert.equal(result.state.phase, "music_waiting_vocal");
  assert.deepEqual(result.commands, [
    { type: "clear_voice_start" },
    { type: "stop_voice" },
    { type: "play_music", restart: true },
    { type: "schedule_voice_start", atMs: 3000 },
  ]);

  const started = transitionNarration(result.state, { type: "voice_start" });
  assert.deepEqual(started.commands, [
    { type: "duck_music" },
    { type: "play_voice", restart: true },
  ]);
});

test("seeking beyond vocalStartMs keeps an active narration playing", () => {
  const started = transitionNarration(initialNarrationState, {
    type: "select",
    mode: "intro_overlay",
    voiceReady: true,
    vocalStartMs: 3200,
  });
  const result = transitionNarration(started.state, { type: "seek", positionMs: 3200 });
  assert.equal(result.state.phase, "overlay");
  assert.deepEqual(result.commands, []);
});

test("narration ending restores music without stopping the showcase clip", () => {
  const started = transitionNarration(initialNarrationState, {
    type: "select",
    mode: "intro_overlay",
    voiceReady: true,
  });
  const result = transitionNarration(started.state, { type: "voice_ended" });
  assert.equal(result.state.phase, "music");
  assert.ok(!result.commands.some((command) => command.type === "stop_music"));
});

test("selecting a replacement track stops old narration and clears its pending start", () => {
  const started = transitionNarration(initialNarrationState, {
    type: "select",
    mode: "intro_overlay",
    voiceReady: true,
  });
  const replacement = transitionNarration(started.state, {
    type: "select",
    mode: "vocal_start",
    voiceReady: true,
    vocalStartMs: 4000,
  });
  assert.ok(replacement.commands.some((command) => command.type === "stop_voice"));
  assert.ok(replacement.commands.some((command) => command.type === "clear_voice_start"));
  assert.ok(replacement.commands.some((command) => command.type === "pause_music"));
});
