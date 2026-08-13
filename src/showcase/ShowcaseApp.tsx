import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProfileCard } from "../components/ProfileCard";
import { TopBar } from "../components/TopBar";
import { Player } from "../components/Player";
import { AudioPlayer } from "../components/AudioPlayer";
import { PlaylistQueue } from "../components/PlaylistQueue";
import { DotGrid } from "../components/DotGrid";
import { SideRays } from "../components/SideRays";
import { HostProfileDialog } from "../components/HostProfileDialog";
import { ShowcaseMessagePanel } from "./ShowcaseMessagePanel";
import type { NarrationMode } from "../playback/narration-machine";
import { useNarrationPlayback } from "../playback/useNarrationPlayback";
import { showcaseCatalog } from "./catalog";
import type { ShowcaseTrack } from "./types";
import type { PlaylistSuggestion, RadioPick, Track } from "./types";

const modeKey = "claudio:narration-mode";

function asset(path: string) { return new URL(path, document.baseURI).href; }
function formatTime(seconds: number) { return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}` : "0:00"; }
function initialMode(): NarrationMode { return window.localStorage.getItem(modeKey) === "vocal_start" ? "vocal_start" : "intro_overlay"; }

export function ShowcaseApp() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const djVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeTrackRef = useRef<ShowcaseTrack>(showcaseCatalog[0]);
  const voiceRunRef = useRef(0);
  const fadeFrameRef = useRef<number | undefined>(undefined);
  const volumeRef = useRef(0.5);
  const modeRef = useRef<NarrationMode>(initialMode());
  const hostProfileTriggerRef = useRef<HTMLButtonElement>(null);
  const [entered, setEntered] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [trackIndex, setTrackIndex] = useState(0);
  const [mode, setMode] = useState<NarrationMode>(initialMode);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [now, setNow] = useState(() => new Date());
  const [isHostProfileOpen, setIsHostProfileOpen] = useState(false);
  const track = showcaseCatalog[trackIndex];
  const next = showcaseCatalog[(trackIndex + 1) % showcaseCatalog.length];
  const playlist = useMemo<PlaylistSuggestion>(() => ({
    playlistId: "showcase",
    title: "Claudio Showcase",
    scene: "static showcase",
    summary: "Pre-generated showcase tracks",
    source: "static",
    generatedAt: "2026-08-12",
    picks: showcaseCatalog.map((item) => ({ songId: item.id, djLine: item.djText, reason: "showcase", moodTags: [], source: "static" }))
  }), []);
  const trackMap = useMemo(() => new Map<string, Track>(showcaseCatalog.map((item) => [item.id, {
    id: item.id, title: item.title, artist: item.artist, album: item.album, folder: "showcase", extension: item.musicSrc.split(".").pop() ?? "audio", source: "showcase", playable: true, size: 0, addedAt: "2026-08-12"
  }])), []);
  const queue = playlist.picks.slice(trackIndex + 1);

  useEffect(() => { document.documentElement.dataset.theme = theme; return () => { delete document.documentElement.dataset.theme; }; }, [theme]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => {
    const syncVisualHeight = () => {
      const visualViewport = window.visualViewport;
      document.documentElement.style.setProperty("--showcase-visual-height", `${visualViewport?.height ?? window.innerHeight}px`);
    };

    syncVisualHeight();
    window.addEventListener("resize", syncVisualHeight);
    window.visualViewport?.addEventListener("resize", syncVisualHeight);
    return () => {
      window.removeEventListener("resize", syncVisualHeight);
      window.visualViewport?.removeEventListener("resize", syncVisualHeight);
    };
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => () => { if (fadeFrameRef.current !== undefined) cancelAnimationFrame(fadeFrameRef.current); }, []);

  const setDucking = useCallback((ducking: boolean) => {
    const music = audioRef.current;
    if (!music) return;
    if (fadeFrameRef.current !== undefined) cancelAnimationFrame(fadeFrameRef.current);
    const start = music.volume;
    const target = volumeRef.current * (ducking ? 0.55 : 1);
    const durationMs = ducking ? 280 : 900;
    const began = performance.now();
    const update = (time: number) => { const progress = Math.min(1, (time - began) / durationMs); music.volume = start + (target - start) * progress; if (progress < 1) fadeFrameRef.current = requestAnimationFrame(update); };
    fadeFrameRef.current = requestAnimationFrame(update);
  }, []);

  const playMusic = useCallback((source: string, restart: boolean) => {
    const music = audioRef.current;
    if (!music) return;
    const begin = () => {
      if (restart) music.currentTime = 0;
      music.volume = volumeRef.current;
      void music.play().catch(() => setIsPlaying(false));
    };
    if (music.src !== source) {
      music.addEventListener("canplay", begin, { once: true });
      music.src = source;
      music.load();
      return;
    }
    begin();
  }, []);

  const primeVoice = useCallback((source: string) => {
    const voice = djVoiceAudioRef.current;
    if (!voice) return;
    const primeRun = ++voiceRunRef.current;
    const url = asset(source);
    voice.loop = true;
    voice.muted = true;
    voice.src = url;
    voice.currentTime = 0;
    void voice.play().then(() => {
      if (primeRun !== voiceRunRef.current || !voice.muted) return;
    }).catch(() => {
      if (primeRun === voiceRunRef.current) voice.loop = false;
    });
  }, []);

  const stopVoice = useCallback(() => { voiceRunRef.current += 1; const voice = djVoiceAudioRef.current; if (voice) { voice.loop = false; voice.onended = null; voice.onerror = null; voice.pause(); voice.currentTime = 0; } setIsSpeaking(false); }, []);
  const playVoice = useCallback((restart: boolean) => {
    const voice = djVoiceAudioRef.current;
    const selected = activeTrackRef.current;
    if (!voice || !selected) return Promise.resolve(false);
    const source = asset(selected.djAudioSrc);
    const runId = ++voiceRunRef.current;
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (played: boolean) => { if (settled || runId !== voiceRunRef.current) return; settled = true; setIsSpeaking(false); resolve(played); };
      const begin = () => {
        if (runId !== voiceRunRef.current) return;
        voice.loop = false;
        if (restart) voice.currentTime = 0;
        voice.muted = false;
        voice.volume = modeRef.current === "vocal_start" ? 0.62 : 1;
        void voice.play().then(() => setIsSpeaking(true)).catch(() => finish(false));
      };
      voice.onended = () => finish(true);
      voice.onerror = () => finish(false);
      if (voice.src !== source) {
        voice.addEventListener("canplay", begin, { once: true });
        voice.src = source;
        voice.load();
        return;
      }
      begin();
    });
  }, []);

  const narration = useNarrationPlayback({ audioRef, playMusic, pauseMusic: () => audioRef.current?.pause(), playVoice, pauseVoice: () => djVoiceAudioRef.current?.pause(), stopVoice, setDucking });
  const startTrack = useCallback((index: number) => {
    const selected = showcaseCatalog[index];
    activeTrackRef.current = selected;
    setTrackIndex(index);
    setCurrentTime(0);
    setDuration(0);
    narration.cancel();
    primeVoice(selected.djAudioSrc);
    narration.select({ mode, musicSource: asset(selected.musicSrc), vocalStartMs: selected.vocalStartMs, introDelayMs: 3000 });
    narration.voiceReady();
  }, [mode, narration, primeVoice]);

  function togglePlay() {
    if (!entered) { setEntered(true); startTrack(0); return; }
    if (narration.phase === "paused") { narration.resume(); return; }
    if (isPlaying || isSpeaking) { narration.pause(); return; }
    startTrack(trackIndex);
  }
  function changeMode(nextMode: NarrationMode) { setMode(nextMode); window.localStorage.setItem(modeKey, nextMode); }
  function seek(time: number) { if (audioRef.current) audioRef.current.currentTime = time; setCurrentTime(time); narration.seek(time * 1000); }
  function changeVolume(nextVolume: number) { volumeRef.current = nextVolume; setVolume(nextVolume); if (audioRef.current) audioRef.current.volume = nextVolume; }
  function handleMusicEnded() {
    const music = audioRef.current;
    if (music) music.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }
  const openHostProfile = useCallback((trigger: HTMLButtonElement) => { hostProfileTriggerRef.current = trigger; setIsHostProfileOpen(true); }, []);

  return (
    <main className="shell showcase-shell">
      <DotGrid className="dot-grid--ambient" />
      <section className="stage">
        <SideRays />
        <TopBar theme={theme} onThemeToggle={setTheme} onHostProfileOpen={openHostProfile} />
        <section className="claudio-console">
          <ProfileCard now={now} weekday={now.toLocaleDateString("en-US", { weekday: "long" })} dateStamp={now.toLocaleDateString("en-GB")} />
          <div className="player-strip"><div className="station-spacer" aria-hidden="true" /><Player isPlaying={isPlaying} currentTime={currentTime} duration={duration} volume={volume} isLoadingPick={false} isSpeaking={isSpeaking} narrationMode={mode} vocalStartMs={track.vocalStartMs} hasDjVoice recentPlayed={[]} hasPrevious={showcaseCatalog.length > 1} activeTasteMarks={[]} hasTrack currentTrack={track} nowPlayingDj={{ songId: track.id, say: track.djText, voiceUrl: asset(track.djAudioSrc), source: "static", status: isSpeaking ? "voice_ready" : "idle" }} audioRef={audioRef} djVoiceAudioRef={djVoiceAudioRef} onPrevious={() => startTrack((trackIndex - 1 + showcaseCatalog.length) % showcaseCatalog.length)} onTogglePlay={togglePlay} onNext={() => startTrack((trackIndex + 1) % showcaseCatalog.length)} onTaste={() => undefined} onStopVoice={() => narration.cancel()} onNarrationModeChange={changeMode} onSeek={seek} onVolumeChange={changeVolume} formatTime={formatTime} onHostProfileOpen={openHostProfile} /></div>
          <PlaylistQueue playlist={playlist} queue={queue} currentTrack={trackMap.get(track.id) ?? null} trackMap={trackMap} onSelectPick={(pick: RadioPick) => startTrack(showcaseCatalog.findIndex((item) => item.id === pick.songId))} />
          <ShowcaseMessagePanel now={now} />
          <AudioPlayer audioRef={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onLoadedMetadata={setDuration} onTimeUpdate={(time) => { setCurrentTime(time); narration.progress(time * 1000); }} onEnded={handleMusicEnded} />
          {next.id !== track.id && <audio key={next.id} src={asset(next.musicSrc)} preload="metadata" />}
        </section>
        {!entered && <div className="showcase-entry-gate"><div><span>STATIC BROADCAST</span><h2>Claudio</h2><p>Showcase</p><button type="button" onClick={togglePlay}>进入电台</button></div></div>}
      </section>
      <HostProfileDialog open={isHostProfileOpen} onClose={() => setIsHostProfileOpen(false)} returnFocusRef={hostProfileTriggerRef} currentTrack={trackMap.get(track.id) ?? null} isPlaying={isPlaying} libraryCount={showcaseCatalog.length} />
    </main>
  );
}
