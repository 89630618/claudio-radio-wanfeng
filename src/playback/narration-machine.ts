export type NarrationMode = "vocal_start" | "intro_overlay";

export type NarrationPhase =
  | "idle"
  | "waiting"
  | "music_waiting_vocal"
  | "vocal_waiting_voice"
  | "overlay"
  | "music"
  | "ended"
  | "paused";

export type NarrationState = {
  phase: NarrationPhase;
  mode: NarrationMode | null;
  vocalStartMs?: number;
  voiceReady: boolean;
  stopMusicOnVoiceEnd: boolean;
  pausedPhase?: Exclude<NarrationPhase, "idle" | "ended" | "paused">;
};

export type NarrationCommand =
  | { type: "clear_cutoff" }
  | { type: "schedule_cutoff"; atMs: number }
  | { type: "clear_voice_start" }
  | { type: "schedule_voice_start"; atMs: number }
  | { type: "stop_voice" }
  | { type: "pause_voice" }
  | { type: "play_voice"; restart: boolean }
  | { type: "pause_music" }
  | { type: "play_music"; restart: boolean }
  | { type: "stop_music" }
  | { type: "duck_music" }
  | { type: "restore_music" };

export type NarrationEvent =
  | { type: "select"; mode: NarrationMode; voiceReady: boolean; vocalStartMs?: number; stopMusicOnVoiceEnd?: boolean }
  | { type: "voice_ready" }
  | { type: "voice_failed" }
  | { type: "voice_start" }
  | { type: "voice_ended" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "seek"; positionMs: number }
  | { type: "cutoff" }
  | { type: "cancel" };

export const initialNarrationState: NarrationState = {
  phase: "idle",
  mode: null,
  voiceReady: false,
  stopMusicOnVoiceEnd: false,
};

function cutoff(vocalStartMs?: number): NarrationCommand[] {
  return vocalStartMs ? [{ type: "schedule_cutoff", atMs: Math.max(0, vocalStartMs - 800) }] : [];
}

function startOverlay(state: NarrationState, restartMusic: boolean, restartVoice = true) {
  return {
    state: { ...state, phase: "overlay" as const, pausedPhase: undefined },
    commands: [
      ...(restartMusic ? [{ type: "play_music" as const, restart: true }] : []),
      { type: "duck_music" as const },
      { type: "play_voice" as const, restart: restartVoice },
      ...(state.mode === "intro_overlay" ? cutoff(state.vocalStartMs) : []),
    ],
  };
}

function finishVoice(state: NarrationState) {
  const commands: NarrationCommand[] = [
    { type: "clear_cutoff" },
    { type: "clear_voice_start" },
    { type: "stop_voice" },
    { type: "restore_music" },
  ];
  if (state.stopMusicOnVoiceEnd) commands.push({ type: "stop_music" });
  return { state: { ...state, phase: state.stopMusicOnVoiceEnd ? "ended" as const : "music" as const }, commands };
}

export function transitionNarration(state: NarrationState, event: NarrationEvent): { state: NarrationState; commands: NarrationCommand[] } {
  if (event.type === "select") {
    const next: NarrationState = {
      phase: event.mode === "vocal_start" ? "music_waiting_vocal" : event.voiceReady ? "idle" : "waiting",
      mode: event.mode,
      vocalStartMs: event.vocalStartMs,
      voiceReady: event.voiceReady,
      stopMusicOnVoiceEnd: event.stopMusicOnVoiceEnd ?? false,
    };
    const commands: NarrationCommand[] = [{ type: "clear_cutoff" }, { type: "clear_voice_start" }, { type: "stop_voice" }];
    if (state.phase !== "idle") commands.push({ type: "pause_music" }, { type: "restore_music" });

    if (event.mode === "vocal_start") {
      commands.push({ type: "play_music", restart: true });
      if (event.vocalStartMs && event.vocalStartMs > 0) {
        commands.push({ type: "schedule_voice_start", atMs: event.vocalStartMs });
        return { state: next, commands };
      }
      if (event.voiceReady) {
        const started = startOverlay(next, false);
        return { state: started.state, commands: [...commands, ...started.commands] };
      }
      return { state: { ...next, phase: "vocal_waiting_voice" }, commands };
    }
    if (!event.voiceReady) return { state: next, commands };
    const started = startOverlay(next, true);
    return { state: started.state, commands: [...commands, ...started.commands] };
  }

  if (event.type === "voice_ready") {
    if (state.phase === "waiting") return startOverlay({ ...state, voiceReady: true }, true);
    if (state.phase === "vocal_waiting_voice") return startOverlay({ ...state, voiceReady: true }, false);
    if (state.phase === "music_waiting_vocal") return { state: { ...state, voiceReady: true }, commands: [] };
  }
  if (event.type === "voice_failed") {
    if (state.phase === "waiting" || state.phase === "vocal_waiting_voice") {
      return { state: { ...state, phase: "music", voiceReady: false, pausedPhase: undefined }, commands: [{ type: "clear_voice_start" }, { type: "restore_music" }, ...(state.phase === "waiting" ? [{ type: "play_music" as const, restart: true }] : [])] };
    }
    if (state.phase === "music_waiting_vocal") return { state: { ...state, phase: "music", voiceReady: false }, commands: [{ type: "clear_voice_start" }, { type: "restore_music" }] };
  }
  if (event.type === "voice_start" && state.phase === "music_waiting_vocal") {
    if (!state.voiceReady) return { state: { ...state, phase: "vocal_waiting_voice" }, commands: [] };
    return startOverlay(state, false);
  }
  if ((event.type === "voice_ended" || event.type === "cutoff") && state.phase === "overlay") return finishVoice(state);
  if (event.type === "pause" && ["music_waiting_vocal", "vocal_waiting_voice", "overlay", "music"].includes(state.phase)) {
    return { state: { ...state, pausedPhase: state.phase as NarrationState["pausedPhase"], phase: "paused" }, commands: [{ type: "pause_music" }, { type: "pause_voice" }, { type: "clear_cutoff" }, { type: "clear_voice_start" }] };
  }
  if (event.type === "resume" && state.phase === "paused") {
    const phase = state.pausedPhase ?? "music";
    const resumed = { ...state, phase, pausedPhase: undefined };
    if (phase === "overlay") {
      const started = startOverlay(resumed, false, false);
      return { state: started.state, commands: [{ type: "play_music", restart: false }, ...started.commands] };
    }
    if (phase === "music_waiting_vocal") return { state: resumed, commands: [{ type: "play_music", restart: false }, ...(state.vocalStartMs ? [{ type: "schedule_voice_start" as const, atMs: state.vocalStartMs }] : [])] };
    return { state: resumed, commands: [{ type: "play_music", restart: false }] };
  }
  if (event.type === "seek" && state.vocalStartMs && event.positionMs >= state.vocalStartMs) {
    if (state.phase === "music_waiting_vocal") return state.voiceReady ? startOverlay(state, false) : { state: { ...state, phase: "vocal_waiting_voice" }, commands: [] };
    if (state.phase === "overlay" || (state.phase === "paused" && state.pausedPhase === "overlay")) return { state: { ...state, phase: "music", pausedPhase: undefined }, commands: [{ type: "clear_cutoff" }, { type: "clear_voice_start" }, { type: "stop_voice" }, { type: "restore_music" }] };
  }
  if (event.type === "cancel") return { state: initialNarrationState, commands: [{ type: "clear_cutoff" }, { type: "clear_voice_start" }, { type: "stop_voice" }, { type: "pause_music" }, { type: "restore_music" }] };
  return { state, commands: [] };
}
