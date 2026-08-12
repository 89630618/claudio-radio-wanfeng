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
    { type: "clear_cutoff" },
    { type: "clear_voice_start" },
    { type: "stop_voice" },
    { type: "play_music", restart: true },
    { type: "schedule_voice_start", atMs: 2400 },
  ]);

  const started = transitionNarration(selected.state, { type: "voice_start" });
  assert.equal(started.state.phase, "overlay");
  assert.deepEqual(started.commands, [
    { type: "duck_music" },
    { type: "play_voice", restart: true },
  ]);
});

test("intro_overlay starts music and narration together and schedules vocal cutoff", () => {
  const result = transitionNarration(initialNarrationState, {
    type: "select",
    mode: "intro_overlay",
    voiceReady: true,
    vocalStartMs: 3200,
  });
  assert.equal(result.state.phase, "overlay");
  assert.deepEqual(result.commands.slice(-4), [
    { type: "play_music", restart: true },
    { type: "duck_music" },
    { type: "play_voice", restart: true },
    { type: "schedule_cutoff", atMs: 2400 },
  ]);
});

test("seeking beyond vocalStartMs stops active narration and restores music", () => {
  const started = transitionNarration(initialNarrationState, {
    type: "select",
    mode: "intro_overlay",
    voiceReady: true,
    vocalStartMs: 3200,
  });
  const result = transitionNarration(started.state, { type: "seek", positionMs: 3200 });
  assert.equal(result.state.phase, "music");
  assert.deepEqual(result.commands, [
    { type: "clear_cutoff" },
    { type: "clear_voice_start" },
    { type: "stop_voice" },
    { type: "restore_music" },
  ]);
});

test("showcase may stop its short music clip when narration ends", () => {
  const started = transitionNarration(initialNarrationState, {
    type: "select",
    mode: "intro_overlay",
    voiceReady: true,
    stopMusicOnVoiceEnd: true,
  });
  const result = transitionNarration(started.state, { type: "voice_ended" });
  assert.equal(result.state.phase, "ended");
  assert.ok(result.commands.some((command) => command.type === "stop_music"));
});
