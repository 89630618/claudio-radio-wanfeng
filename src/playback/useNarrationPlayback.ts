import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { initialNarrationState, transitionNarration, type NarrationCommand, type NarrationMode, type NarrationState } from "./narration-machine";

type Options = {
  audioRef: RefObject<HTMLAudioElement | null>;
  playMusic: (source: string, restart: boolean) => void;
  pauseMusic: () => void;
  playVoice: (restart: boolean) => Promise<boolean>;
  pauseVoice: () => void;
  stopVoice: () => void;
  setDucking: (ducking: boolean) => void;
};

export function useNarrationPlayback(options: Options) {
  const [state, setState] = useState<NarrationState>(initialNarrationState);
  const stateRef = useRef(state);
  const musicSourceRef = useRef("");
  const cutoffTimerRef = useRef<number | undefined>(undefined);
  const voiceTimerRef = useRef<number | undefined>(undefined);
  const voiceRunRef = useRef(0);
  const clearCutoff = useCallback(() => { if (cutoffTimerRef.current !== undefined) window.clearTimeout(cutoffTimerRef.current); cutoffTimerRef.current = undefined; }, []);
  const clearVoiceStart = useCallback(() => { if (voiceTimerRef.current !== undefined) window.clearTimeout(voiceTimerRef.current); voiceTimerRef.current = undefined; }, []);
  const applyRef = useRef<(commands: NarrationCommand[]) => void>(() => undefined);
  const dispatchRef = useRef<(event: Parameters<typeof transitionNarration>[1]) => void>(() => undefined);

  const dispatch = useCallback((event: Parameters<typeof transitionNarration>[1]) => {
    const result = transitionNarration(stateRef.current, event);
    stateRef.current = result.state;
    setState(result.state);
    applyRef.current(result.commands);
  }, []);

  const apply = useCallback((commands: NarrationCommand[]) => {
    for (const command of commands) {
      if (command.type === "clear_cutoff") clearCutoff();
      else if (command.type === "schedule_cutoff") { clearCutoff(); cutoffTimerRef.current = window.setTimeout(() => dispatchRef.current({ type: "cutoff" }), Math.max(0, command.atMs - (options.audioRef.current?.currentTime ?? 0) * 1000)); }
      else if (command.type === "clear_voice_start") clearVoiceStart();
      else if (command.type === "schedule_voice_start") { clearVoiceStart(); voiceTimerRef.current = window.setTimeout(() => dispatchRef.current({ type: "voice_start" }), Math.max(0, command.atMs - (options.audioRef.current?.currentTime ?? 0) * 1000)); }
      else if (command.type === "stop_voice") { voiceRunRef.current += 1; options.stopVoice(); }
      else if (command.type === "pause_voice") options.pauseVoice();
      else if (command.type === "play_voice") {
        if (command.restart) {
          const runId = ++voiceRunRef.current;
          void options.playVoice(true).then((played) => { if (runId === voiceRunRef.current) dispatchRef.current({ type: played ? "voice_ended" : "voice_failed" }); });
        } else void options.playVoice(false);
      } else if (command.type === "pause_music") options.pauseMusic();
      else if (command.type === "play_music") options.playMusic(musicSourceRef.current, command.restart);
      else if (command.type === "stop_music") options.audioRef.current?.pause();
      else if (command.type === "duck_music") options.setDucking(true);
      else if (command.type === "restore_music") options.setDucking(false);
    }
  }, [clearCutoff, clearVoiceStart, options]);

  applyRef.current = apply;
  dispatchRef.current = dispatch;
  useEffect(() => () => { clearCutoff(); clearVoiceStart(); voiceRunRef.current += 1; }, [clearCutoff, clearVoiceStart]);

  return {
    phase: state.phase,
    activeMode: state.mode,
    select: ({ mode, musicSource, vocalStartMs, stopMusicOnVoiceEnd = false }: { mode: NarrationMode; musicSource: string; vocalStartMs?: number; stopMusicOnVoiceEnd?: boolean }) => { musicSourceRef.current = musicSource; dispatch({ type: "select", mode, voiceReady: false, vocalStartMs, stopMusicOnVoiceEnd }); },
    voiceReady: () => dispatch({ type: "voice_ready" }),
    voiceFailed: () => dispatch({ type: "voice_failed" }),
    pause: () => dispatch({ type: "pause" }),
    resume: () => dispatch({ type: "resume" }),
    seek: (positionMs: number) => dispatch({ type: "seek", positionMs }),
    cancel: () => dispatch({ type: "cancel" }),
  };
}
