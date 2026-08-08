import { CSSProperties, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Heart, Loader2, Pause, Play, SkipBack, SkipForward, Square, Volume2 } from "lucide-react";
import { AnimatedContent } from "./AnimatedContent";
import { ElasticVolumeSlider } from "./ElasticVolumeSlider";
import "./Player.transcript.css";

type PlayerProps = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoadingPick: boolean;
  isSpeaking: boolean;
  hasDjVoice: boolean;
  recentPlayed: { songId: string }[];
  hasPrevious: boolean;
  activeTasteMarks: string[];
  hasTrack: boolean;
  currentTrack: { id: string; title: string; artist: string } | null;
  nowPlayingDj: {
    songId: string;
    say: string;
    voiceUrl: string;
    source: "ai" | "rules";
    status: "idle" | "writing" | "voice_preparing" | "voice_ready" | "voice_failed";
  } | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  djVoiceAudioRef: RefObject<HTMLAudioElement | null>;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onTaste: (action: string) => void;
  onStopVoice: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  formatTime: (seconds: number) => string;
  onHostProfileOpen: (trigger: HTMLButtonElement) => void;
};

export function Player({
  isPlaying,
  currentTime,
  duration,
  volume,
  isLoadingPick,
  isSpeaking,
  hasDjVoice,
  hasPrevious,
  activeTasteMarks,
  hasTrack,
  currentTrack,
  nowPlayingDj,
  audioRef,
  djVoiceAudioRef,
  onPrevious,
  onTogglePlay,
  onNext,
  onTaste,
  onStopVoice,
  onSeek,
  onVolumeChange,
  formatTime,
  onHostProfileOpen
}: PlayerProps) {
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [voiceCurrentTime, setVoiceCurrentTime] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [clockTime, setClockTime] = useState(() => new Date());
  const [voiceLevels, setVoiceLevels] = useState<number[]>(() => Array(92).fill(0));
  const voiceAnimationFrameRef = useRef<number | undefined>(undefined);
  const voiceProgressFrameRef = useRef<number | undefined>(undefined);
  const activeTranscriptRef = useRef<HTMLParagraphElement | null>(null);
  const songAudioContextRef = useRef<AudioContext | null>(null);
  const songAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const songAudioAnalyserRef = useRef<AnalyserNode | null>(null);
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const isLiked = activeTasteMarks.includes("like");
  const hasCurrentDj = Boolean(nowPlayingDj && nowPlayingDj.songId === currentTrack?.id);
  const djLine = hasCurrentDj ? nowPlayingDj!.say : "";
  const djVoiceUrl = hasCurrentDj ? nowPlayingDj!.voiceUrl : "";
  const isVoiceActive = isVoicePlaying;
  const isSongWaveActive = isPlaying;
  const voiceStatus = hasCurrentDj ? nowPlayingDj!.status : "idle";
  const isVoicePreparing = voiceStatus === "writing" || voiceStatus === "voice_preparing";
  const footerWaveShape = useMemo(
    () => Array.from({ length: 68 }, (_, index) => {
      const pulse = 0.34 + Math.abs(Math.sin(index * 0.63)) * 0.28;
      const swell = Math.exp(-((index - 20) ** 2) / 122) * 0.24 + Math.exp(-((index - 49) ** 2) / 146) * 0.2;
      return Math.min(1, pulse + swell);
    }),
    []
  );

  const transcriptLines = useMemo(() => {
    const text = djLine.trim();
    if (!text) return ["下一段串词正在准备中"];
    return text
      .replace(/([。！？!?])\s*/g, "$1\n")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [djLine]);

  const transcriptLineMeta = useMemo(() => {
    let offset = 0;
    return transcriptLines.map((line) => {
      const start = offset;
      offset += [...line].length;
      return { line, start, end: offset };
    });
  }, [transcriptLines]);

  const totalTranscriptChars = transcriptLineMeta.at(-1)?.end ?? 0;
  const voiceProgress = voiceDuration > 0 ? Math.min(100, (voiceCurrentTime / voiceDuration) * 100) : 0;
  const spokenCharPosition = (voiceProgress / 100) * totalTranscriptChars;
  const spokenCharIndex =
    totalTranscriptChars > 0 ? Math.min(totalTranscriptChars - 1, Math.floor(spokenCharPosition)) : 0;
  const activeTranscriptIndex = transcriptLineMeta.findIndex((item) => spokenCharIndex >= item.start && spokenCharIndex < item.end);

  useEffect(() => {
    if (isVoicePlaying && activeTranscriptIndex >= 0) {
      activeTranscriptRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeTranscriptIndex, isVoicePlaying]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const audio = djVoiceAudioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setVoiceCurrentTime(0);
    setVoiceDuration(0);
    setIsVoicePlaying(false);

    const updateTime = () => setVoiceCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setVoiceDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    let lastProgressUpdate = 0;
    const syncProgress = (time: number) => {
      if (!audio.paused && !audio.ended && time - lastProgressUpdate >= 33) {
        setVoiceCurrentTime(audio.currentTime || 0);
        lastProgressUpdate = time;
      }
      if (!audio.paused && !audio.ended) voiceProgressFrameRef.current = requestAnimationFrame(syncProgress);
    };
    const markPlaying = () => {
      setIsVoicePlaying(true);
      if (!voiceProgressFrameRef.current) voiceProgressFrameRef.current = requestAnimationFrame(syncProgress);
    };
    const markStopped = () => {
      setIsVoicePlaying(false);
      if (voiceProgressFrameRef.current) cancelAnimationFrame(voiceProgressFrameRef.current);
      voiceProgressFrameRef.current = undefined;
    };
    const reset = () => {
      setVoiceCurrentTime(0);
      setVoiceDuration(0);
      setIsVoicePlaying(false);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("play", markPlaying);
    audio.addEventListener("pause", markStopped);
    audio.addEventListener("ended", markStopped);
    audio.addEventListener("emptied", reset);
    updateDuration();
    setIsVoicePlaying(!audio.paused && !audio.ended);
    if (!audio.paused && !audio.ended) markPlaying();

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("play", markPlaying);
      audio.removeEventListener("pause", markStopped);
      audio.removeEventListener("ended", markStopped);
      audio.removeEventListener("emptied", reset);
      if (voiceProgressFrameRef.current) cancelAnimationFrame(voiceProgressFrameRef.current);
      voiceProgressFrameRef.current = undefined;
    };
  }, [djVoiceAudioRef, djVoiceUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const context = songAudioContextRef.current ?? new AudioContext();
    songAudioContextRef.current = context;
    const analyser = songAudioAnalyserRef.current ?? context.createAnalyser();
    songAudioAnalyserRef.current = analyser;
    const source = songAudioSourceRef.current ?? context.createMediaElementSource(audio);
    songAudioSourceRef.current = source;
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.56;
    source.connect(analyser);
    analyser.connect(context.destination);

    const resume = () => void context.resume();
    audio.addEventListener("play", resume);

    return () => {
      audio.removeEventListener("play", resume);
      source.disconnect();
      analyser.disconnect();
    };
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    const analyser = songAudioAnalyserRef.current;
    if (!audio || !analyser) return;

    const samples = new Uint8Array(analyser.frequencyBinCount);

    let lastFrame = 0;
    let previousSongEnergy = 0;
    let phraseEnergy = 0;
    let beatPulse = 0;
    let peakHolds = Array(92).fill(0);
    const update = (time: number) => {
      if (!isVoicePanelOpen || audio.paused || audio.ended) {
        setVoiceLevels((current) => current.some((level) => level !== 0) ? Array(92).fill(0) : current);
        voiceAnimationFrameRef.current = undefined;
        return;
      }
      if (time - lastFrame >= 50) {
        analyser.getByteFrequencyData(samples);
        const songEnergy = samples.reduce((sum, sample, index) => sum + (index > 1 ? sample : 0), 0) / ((samples.length - 2) * 255);
        phraseEnergy += (songEnergy - phraseEnergy) * (songEnergy > phraseEnergy ? 0.18 : 0.06);
        beatPulse = Math.max(beatPulse * 0.74, Math.max(0, songEnergy - previousSongEnergy) * 5.5);
        previousSongEnergy = songEnergy;
        const performanceEnergy = phraseEnergy * 0.12 + beatPulse * 0.12;
        // Keep every bar inside the musical spectrum; the top ultrasonic bins are usually silent.
        const spectralCeiling = Math.floor(samples.length * 0.42);
        const rawLevels = Array.from({ length: 92 }, (_, index) => {
          const bandStart = Math.floor(2 + (spectralCeiling - 2) * Math.pow(index / 91, 0.74));
          const bandEnd = Math.max(bandStart + 1, Math.floor(2 + (spectralCeiling - 2) * Math.pow((index + 1) / 92, 0.74)));
          let sum = 0;
          for (let bin = bandStart; bin <= bandEnd; bin += 1) sum += samples[bin] ?? 0;
          const localEnergy = sum / ((bandEnd - bandStart + 1) * 255);
          const contrastEnergy = Math.max(0, localEnergy - songEnergy * 0.3);
          return Math.min(1, Math.pow(localEnergy * 0.76 + contrastEnergy * 0.38 + performanceEnergy, 0.78) * 1.16);
        });
        // Project octave-related detail into the display so sparse arrangements keep a full sound field.
        const projectedLevels = rawLevels.map((level, index) => {
          const harmonicWeight = index / 91;
          const lowerHarmonic = rawLevels[Math.floor(index * 0.58)] ?? level;
          const bassHarmonic = rawLevels[Math.floor(index * 0.24)] ?? level;
          return level * (1 - harmonicWeight * 0.3) + lowerHarmonic * harmonicWeight * 0.22 + bassHarmonic * harmonicWeight * 0.1;
        });
        const zoneSize = Math.ceil(projectedLevels.length / 3);
        const zoneLevels = projectedLevels.map((level, index) => {
          const zoneStart = Math.floor(index / zoneSize) * zoneSize;
          const zoneEnd = Math.min(projectedLevels.length, zoneStart + zoneSize);
          const zoneFloor = Math.min(...projectedLevels.slice(zoneStart, zoneEnd));
          const zonePeak = Math.max(...projectedLevels.slice(zoneStart, zoneEnd));
          // Preserve quiet high-frequency movement without amplifying a silent band into noise.
          const zoneRange = Math.max(0.025, zonePeak * 0.32, zonePeak - zoneFloor);
          return (level - zoneFloor) / zoneRange;
        });
        const localPeaks = zoneLevels.map((level, index) => {
          let surroundingEnergy = 0;
          let surroundingCount = 0;
          for (let offset = -3; offset <= 3; offset += 1) {
            if (offset === 0 || zoneLevels[index + offset] === undefined) continue;
            surroundingEnergy += zoneLevels[index + offset];
            surroundingCount += 1;
          }
          return Math.max(0, level - surroundingEnergy / surroundingCount);
        });
        const peakIntensity = 0.58 + phraseEnergy * 0.92 + beatPulse * 0.5;
        const shapedLevels = zoneLevels.map((level, index) => {
          const localPeak = localPeaks[index];
          const nearbyPeak = Math.max(localPeaks[index - 1] ?? 0, localPeaks[index + 1] ?? 0);
          // A brief release makes actual peaks readable as musical phrases instead of one-frame noise.
          const retainedPeak = Math.max(0, peakHolds[index] * 0.78 - localPeak);
          peakHolds[index] = Math.max(localPeak, peakHolds[index] * 0.78);
          return Math.min(1, level + localPeak * peakIntensity + retainedPeak * peakIntensity + nearbyPeak * peakIntensity * 0.22);
        });
        const phraseLift = Math.min(0.34, phraseEnergy * 0.52 + beatPulse * 0.16);
        const expressiveLevels = shapedLevels.map((level) => {
          return Math.min(1, phraseLift + level * (0.38 + phraseEnergy * 0.38 + beatPulse * 0.16));
        });
        setVoiceLevels((previous) => expressiveLevels.map((level, index) => {
          const previousLevel = previous[index] ?? 0;
          return previousLevel + (level - previousLevel) * (level > previousLevel ? 0.48 : 0.18);
        }));
        lastFrame = time;
      }
      voiceAnimationFrameRef.current = requestAnimationFrame(update);
    };
    if (isVoicePanelOpen && isSongWaveActive) voiceAnimationFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (voiceAnimationFrameRef.current) cancelAnimationFrame(voiceAnimationFrameRef.current);
      voiceAnimationFrameRef.current = undefined;
    };
  }, [audioRef, isVoicePanelOpen, isSongWaveActive]);

  async function handleVoiceToggle() {
    const audio = djVoiceAudioRef.current;
    if (audio && djVoiceUrl) {
      if (!audio.paused && !audio.ended) {
        audio.pause();
        return;
      }
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
      return;
    }
    onStopVoice();
  }

  function handleVoicePanelOpen() {
    void songAudioContextRef.current?.resume();
    setIsVoicePanelOpen(true);
  }

  function renderKaraokeLine(line: string, lineStart: number) {
    return (
      <span className="karaoke-line">
        {[...line].map((character, index) => {
          // Adjacent glyphs overlap slightly so the reading point never snaps.
          const characterProgress = Math.min(100, Math.max(0, ((spokenCharPosition - lineStart - index + 0.35) / 0.7) * 100));

          return (
            <span
              className="karaoke-char"
              key={`${character}-${index}`}
              style={{ "--character-progress": `${characterProgress}%` } as CSSProperties & Record<string, string>}
            >
              {character}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div className={`transport-strip ${isPlaying ? "is-playing" : "is-paused"} ${isVoiceActive ? "voice-active" : ""} ${isVoicePreparing ? "voice-preparing" : ""}`}>
      <div className="now-mini" key={currentTrack?.id ?? "waiting"}>
        <button className="mini-cover wave-trigger" type="button" onClick={handleVoicePanelOpen} aria-label="Open Claudio voice panel" title="Open Claudio voice panel">
          <span className="mini-bars">
            <i />
            <i />
            <i />
            <i />
          </span>
        </button>
        <div className="mini-copy">
          <strong>{currentTrack?.title ?? "Waiting for signal"}</strong>
          <span>{currentTrack?.artist ?? "Claudio Radio"}</span>
          {djVoiceUrl && <audio ref={djVoiceAudioRef} className="dj-voice-hidden" src={djVoiceUrl} preload="metadata" />}
        </div>
        <div className="track-signal" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <i key={index} style={{ "--signal-index": index, "--signal-delay": `${index * -47}ms` } as CSSProperties & Record<string, string | number>} />
          ))}
        </div>
      </div>

      <div className="transport">
        <button className="icon-button secondary" onClick={onPrevious} disabled={!hasPrevious} title="Previous track" aria-label="Previous track">
          <SkipBack />
        </button>
        <button className="icon-button primary" onClick={onTogglePlay} title={isPlaying ? "Pause" : "Play"} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause /> : <Play />}
        </button>
        <button className="icon-button secondary" onClick={onNext} disabled={isLoadingPick} title="Next" aria-label="Next">
          {isLoadingPick ? <Loader2 className="spin" /> : <SkipForward />}
        </button>
        <button className="icon-button secondary" onClick={onStopVoice} disabled={!isSpeaking && !hasDjVoice} title={isSpeaking ? "Stop voice" : hasDjVoice ? "Play DJ voice" : "DJ voice is preparing"} aria-label={isSpeaking ? "Stop voice" : "DJ voice"}>
          {isSpeaking ? <Square /> : <Volume2 />}
        </button>
      </div>

      <div className="taste-controls compact" aria-label="Preference feedback">
        <button className={isLiked ? "taste-chip icon-only active" : "taste-chip icon-only"} onClick={() => onTaste("like")} disabled={!hasTrack} title="Like this track" aria-label="Like this track">
          <Heart />
        </button>
        <button className="taste-chip word" type="button" onClick={onStopVoice} disabled={!isSpeaking && !hasDjVoice}>
          HIDE
        </button>
        <button className={isLiked ? "taste-chip word active" : "taste-chip word"} type="button" onClick={() => onTaste("like")} disabled={!hasTrack}>
          FAV
        </button>
      </div>

      <ElasticVolumeSlider value={volume} onChange={onVolumeChange} />

      <div className="progress-row">
        <span>{formatTime(currentTime)}</span>
        <input aria-label="Playback progress" type="range" min="0" max={duration || 0} step="1" value={currentTime} onChange={(event) => onSeek(Number(event.target.value))} style={{ "--progress": `${progress}%` } as CSSProperties & Record<string, string>} />
        <span>{formatTime(duration)}</span>
      </div>

      {isVoicePanelOpen && (
        <div className="voice-panel-backdrop" role="dialog" aria-modal="true" aria-label="Claudio voice transcript">
          <AnimatedContent className="voice-panel-motion">
          <div className="voice-panel">
            <button className="voice-panel-close" type="button" onClick={() => setIsVoicePanelOpen(false)} aria-label="Close voice panel">
              Close
            </button>
            <div className="voice-panel-head">
              <div className="voice-brand">
                <button type="button" className="avatar-button" onClick={(event) => onHostProfileOpen(event.currentTarget)} aria-label="打开 Claudio 主持人主页">
                  <span className="chat-avatar claudio-avatar" />
                </button>
                <div>
                  <strong>Claudio</strong>
                  <small>{isVoiceActive ? "Speaking..." : "Preparing..."}</small>
                </div>
              </div>
              <span className="voice-timer">{clockTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
            </div>
            <div className={`voice-wave ${isSongWaveActive ? "active" : ""}`} aria-hidden="true">
              {Array.from({ length: 92 }).map((_, index) => (
                <i key={index} style={{ "--bar": "100%", "--energy": `${isSongWaveActive ? voiceLevels[index] : 0}` } as CSSProperties & Record<string, string>} />
              ))}
            </div>
            <div className="voice-card">
              <h2>{currentTrack?.title ?? "Claudio Signal"}</h2>
              <p>{currentTrack?.artist ?? "Claudio Radio"}</p>
              <div className="voice-playback-row">
                <button type="button" onClick={onTogglePlay} aria-label={isPlaying ? "Pause track" : "Play track"}>
                  {isPlaying ? <Pause /> : <Play />}
                </button>
                <input
                  className="voice-song-progress"
                  aria-label="Track playback progress"
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="1"
                  value={currentTime}
                  onChange={(event) => onSeek(Number(event.target.value))}
                  style={{ "--progress": `${progress}%` } as CSSProperties & Record<string, string>}
                />
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <div className="voice-transcript">
                {transcriptLineMeta.map(({ line, start }, index) => (
                  <p ref={index === activeTranscriptIndex ? activeTranscriptRef : undefined} key={`${line}-${index}`} className={index === activeTranscriptIndex ? "active" : ""}>
                    <small>Claudio · 0:{String(5 + index * 4).padStart(2, "0")}</small>
                    {renderKaraokeLine(line, start)}
                  </p>
                ))}
              </div>
              <div className="voice-footer">
                <span>{formatTime(voiceCurrentTime)}</span>
              <div className={`footer-wave ${isVoiceActive ? "active" : ""}`} style={{ "--played": `${voiceProgress}%` } as CSSProperties & Record<string, string>} aria-hidden="true">
                  {Array.from({ length: 68 }).map((_, index) => (
                    <i key={index} className={index / 67 <= voiceProgress / 100 ? "played" : ""} style={{ "--bar": `${26 + footerWaveShape[index] * 56}%`, "--energy": `${isVoiceActive ? 0.2 + (voiceLevels[Math.floor((index / 67) * 91)] ?? 0) * 0.54 : 0.24}` } as CSSProperties & Record<string, string>} />
                  ))}
                </div>
                <button type="button" onClick={() => void handleVoiceToggle()} aria-label={isVoiceActive ? "Pause voice" : "Play voice"}>
                  {isVoiceActive ? <Pause /> : <Play />}
                </button>
              </div>
            </div>
          </div>
          </AnimatedContent>
        </div>
      )}
    </div>
  );
}
