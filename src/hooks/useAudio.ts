import { useCallback, useEffect, useRef, useState } from "react";

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const unlockAudioRef = useRef<HTMLAudioElement | null>(null);
  const unlockContextRef = useRef<AudioContext | null>(null);
  const silentTrackUrlRef = useRef<string | null>(null);
  const speechRunRef = useRef(0);
  const playRunRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceOn = typeof window !== "undefined" && "speechSynthesis" in window;

  const cancelPendingPlay = useCallback(() => {
    playRunRef.current += 1;
  }, []);

  const prepareTrackAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.src) return;

    const buffer = new ArrayBuffer(8044);
    const view = new DataView(buffer);
    const write = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
    write(0, "RIFF");
    view.setUint32(4, 8036, true);
    write(8, "WAVEfmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true);
    view.setUint32(28, 8000, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    write(36, "data");
    view.setUint32(40, 8000, true);
    new Uint8Array(buffer, 44).fill(128);
    silentTrackUrlRef.current ??= URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
    audio.loop = true;
    audio.muted = true;
    audio.src = silentTrackUrlRef.current;
    audio.load();
  }, []);

  useEffect(() => {
    prepareTrackAudio();
  }, [prepareTrackAudio]);

  const primeTrackAudio = useCallback(() => {
    prepareTrackAudio();
    const audio = audioRef.current;
    if (!audio || (!audio.paused && !audio.ended)) return;

    audio.loop = true;
    audio.muted = true;
    void audio.play().catch(() => undefined);
  }, [prepareTrackAudio]);

  const playAudioSoon = useCallback((streamUrl?: string) => {
    cancelPendingPlay();
    const runId = playRunRef.current;
    const audio = audioRef.current;
    if (!audio) {
      setIsPlaying(false);
      return;
    }
    audio.loop = false;
    audio.muted = false;
    if (streamUrl && audio.src !== new URL(streamUrl, window.location.href).href) {
      audio.src = streamUrl;
      audio.load();
    }

    // Keep play() in the originating click chain so Chromium preserves user activation.
    setIsPlaying(true);
    void audio.play().catch(() => {
      if (runId === playRunRef.current) {
        setIsPlaying(false);
      }
    });
  }, [cancelPendingPlay]);

  const pauseAudio = useCallback(() => {
    cancelPendingPlay();
    audioRef.current?.pause();
  }, [cancelPendingPlay]);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return Promise.resolve();

    window.speechSynthesis.cancel();
    const runId = speechRunRef.current + 1;
    speechRunRef.current = runId;
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.96;
    utterance.pitch = 0.92;

    return new Promise<void>((resolve) => {
      const finish = () => {
        if (speechRunRef.current === runId) {
          setIsSpeaking(false);
        }
        resolve();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    });
  }

  function speakAudioUrl(audioUrl: string) {
    const runId = speechRunRef.current + 1;
    speechRunRef.current = runId;
    window.speechSynthesis?.cancel();
    if (!voiceAudioRef.current) {
      voiceAudioRef.current = new Audio();
      voiceAudioRef.current.preload = "auto";
    }
    const voiceAudio = voiceAudioRef.current;
    voiceAudio.pause();
    voiceAudio.currentTime = 0;
    voiceAudio.loop = false;
    voiceAudio.muted = false;
    voiceAudio.playbackRate = 0.86;
    voiceAudio.preservesPitch = true;
    voiceAudio.src = audioUrl;
    setIsSpeaking(true);

    return new Promise<boolean>((resolve) => {
      const finish = (played: boolean) => {
        if (speechRunRef.current === runId) {
          setIsSpeaking(false);
        }
        resolve(played);
      };
      voiceAudio.onended = () => finish(true);
      voiceAudio.onerror = () => finish(false);
      void voiceAudio.play().catch(() => finish(false));
    });
  }

  function stopVoice() {
    window.speechSynthesis?.cancel();
    voiceAudioRef.current?.pause();
    speechRunRef.current += 1;
    setIsSpeaking(false);
  }

  function unlockVoiceAudio() {
    // This runs directly from a user gesture. It gives Chromium a media
    // activation before an async radio/AI request supplies the real source.
    if (!unlockAudioRef.current) {
      unlockAudioRef.current = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
      );
      unlockAudioRef.current.volume = 0.001;
    }
    if (!unlockContextRef.current) {
      unlockContextRef.current = new AudioContext();
    }
    void unlockContextRef.current.resume().catch(() => undefined);
    void unlockAudioRef.current.play().catch(() => undefined);
  }

  function formatTime(seconds: number) {
    if (!Number.isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return `${minutes}:${String(rest).padStart(2, "0")}`;
  }

  return {
    audioRef,
    voiceAudioRef,
    speechRunRef,
    isPlaying,
    setIsPlaying,
    isSpeaking,
    setIsSpeaking,
    voiceOn,
    unlockVoiceAudio,
    primeTrackAudio,
    playAudioSoon,
    pauseAudio,
    speak,
    speakAudioUrl,
    stopVoice,
    formatTime,
  };
}
