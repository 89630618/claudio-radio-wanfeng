import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  generateDjLine,
  getCalendarContext,
  getKuGouLoginStatus,
  getKuGouLibrarySyncStatus,
  getHealth,
  getLibrary,
  getNextPick,
  getToday,
  loginKuGouCellphone,
  logoutKuGou,
  removeTaste,
  sendChat,
  sendDjSampleFeedback,
  sendKuGouCaptcha,
  sendTaste,
  syncKuGouLibrary,
  synthesizeDjVoice,
  updateNowPlaying,
  updateWeatherLocation
} from "./api";
import type { ChatItem, ChatReply, KuGouLibrarySyncStatus, KuGouLoginAccount, KuGouLoginStatus, NowPlayingDj, RadioPick, TodayPick, Track } from "./types";
import { useAudio } from "./hooks/useAudio";
import { TopBar } from "./components/TopBar";
import { ProfileCard } from "./components/ProfileCard";
import { Player } from "./components/Player";
import { ChatPanel } from "./components/ChatPanel";
import { AudioPlayer } from "./components/AudioPlayer";
import { PlaylistQueue } from "./components/PlaylistQueue";
import { HostProfileDialog } from "./components/HostProfileDialog";
import { DotGrid } from "./components/DotGrid";
import { ClickSpark } from "./components/ClickSpark";
import { SideRays } from "./components/SideRays";
import { useNarrationPlayback } from "./playback/useNarrationPlayback";
import type { NarrationMode } from "./playback/narration-machine";
import type { Health, PlaylistSuggestion } from "./types";

const playlistStorageKey = "claudio.activePlaylist";
const playlistQueueStorageKey = "claudio.radioQueue";
const narrationModeStorageKey = "claudio:narration-mode";

type PreparedDjLine = {
  songId: string;
  line: string;
  voiceUrl: string;
  source: "ai" | "rules";
};

function createInitialGreeting() {
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "早上好" : hour < 18 ? "中午好" : "晚上好";
  return `${greeting}，DJ 小王子`;
}
function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function readNarrationMode(): NarrationMode {
  if (typeof window === "undefined") return "intro_overlay";
  const stored = window.localStorage.getItem(narrationModeStorageKey);
  return stored === "vocal_start" || stored === "talk_first" ? "vocal_start" : "intro_overlay";
}

function insertPickIntoPlaylist(playlist: PlaylistSuggestion, pick: RadioPick, currentSongId?: string) {
  if (currentSongId === pick.songId) return playlist;

  const picks = playlist.picks.filter((item) => item.songId !== pick.songId);
  const currentIndex = currentSongId ? picks.findIndex((item) => item.songId === currentSongId) : -1;
  const insertAt = currentIndex >= 0 ? currentIndex + 1 : 0;
  return {
    ...playlist,
    picks: [...picks.slice(0, insertAt), pick, ...picks.slice(insertAt)]
  };
}

export function App() {
  const {
    audioRef,
    voiceAudioRef: djVoiceAudioRef,
    isPlaying,
    setIsPlaying,
    isSpeaking,
    setIsSpeaking,
    playAudioSoon,
    pauseAudio,
    speak,
    unlockVoiceAudio,
    primeTrackAudio,
    stopVoice,
    formatTime,
  } = useAudio();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [today, setToday] = useState<TodayPick[]>([]);
  const [query] = useState("");
  const [chatText, setChatText] = useState("");
  const [chat, setChat] = useState<ChatItem[]>([
    {
      role: "assistant",
      content: createInitialGreeting()
    }
  ]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentPick, setCurrentPick] = useState<RadioPick | null>(null);
  const [playHistory, setPlayHistory] = useState<RadioPick[]>([]);
  const [isLoadingPick, setIsLoadingPick] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [kugouLibraryStatus, setKuGouLibraryStatus] = useState<KuGouLibrarySyncStatus | null>(null);
  const [kugouMobile, setKuGouMobile] = useState("");
  const [kugouCode, setKuGouCode] = useState("");
  const [kugouAccounts, setKuGouAccounts] = useState<KuGouLoginAccount[]>([]);
  const [selectedKuGouUserId, setSelectedKuGouUserId] = useState("");
  const [kugouLoginStatus, setKuGouLoginStatus] = useState<KuGouLoginStatus | null>(null);
  const [isKuGouAuthBusy, setIsKuGouAuthBusy] = useState(false);
  const [status, setStatus] = useState("Preparing Claudio radio");
  const [health, setHealth] = useState<Health | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [activeTasteMarks, setActiveTasteMarks] = useState<string[]>([]);
  const [radioQueue, setRadioQueue] = useState<RadioPick[]>(() => readStoredJson(playlistQueueStorageKey, []));
  const [activePlaylist, setActivePlaylist] = useState<PlaylistSuggestion | null>(() =>
    readStoredJson<PlaylistSuggestion | null>(playlistStorageKey, null)
  );
  const [volume, setVolume] = useState(0.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [djLine, setDjLine] = useState("");
  const [nowPlayingDj, setNowPlayingDj] = useState<NowPlayingDj | null>(null);
  const [djFeedbackMark, setDjFeedbackMark] = useState<"approved" | "rejected" | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [narrationMode, setNarrationMode] = useState<NarrationMode>(readNarrationMode);
  const [isNarrationDucking, setIsNarrationDucking] = useState(false);
  const [isHostProfileOpen, setIsHostProfileOpen] = useState(false);
  const [weatherStatus, setWeatherStatus] = useState("Weather uses fallback location until you allow current location.");
  const [calendarStatus, setCalendarStatus] = useState("Calendar context is loading.");
  const nextRunRef = useRef(0);
  const nextInFlightRef = useRef(false);
  const shouldAutoPlayRef = useRef(true);
  const djLineRunRef = useRef(0);
  const preparedDjRunRef = useRef(0);
  const preparedDjRef = useRef<PreparedDjLine | null>(null);
  const preparedDjPromiseRef = useRef<{ songId: string; promise: Promise<PreparedDjLine | null> } | null>(null);
  const voiceUnlockedRef = useRef(false);
  const speechRecognitionRef = useRef<any>(null);
  const voiceInputActiveRef = useRef(false);
  const microphoneRef = useRef<MediaStream | null>(null);
  const voiceInputTimeoutRef = useRef<number | undefined>(undefined);
  const hostProfileTriggerRef = useRef<HTMLButtonElement>(null);

  const openHostProfile = useCallback((trigger: HTMLButtonElement) => {
    hostProfileTriggerRef.current = trigger;
    setIsHostProfileOpen(true);
  }, []);

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      void import("./components/CompanionModel");
    }, 800);

    return () => window.clearTimeout(preloadTimer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(narrationModeStorageKey, narrationMode);
  }, [narrationMode]);

  useEffect(() => {
    let interval: number | undefined;
    const delay = 60_000 - (Date.now() % 60_000) + 20;
    const timeout = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 60_000);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!activePlaylist) {
      window.localStorage.removeItem(playlistStorageKey);
      window.localStorage.removeItem(playlistQueueStorageKey);
      return;
    }

    window.localStorage.setItem(playlistStorageKey, JSON.stringify(activePlaylist));
    window.localStorage.setItem(playlistQueueStorageKey, JSON.stringify(radioQueue));
  }, [activePlaylist, radioQueue]);

  useEffect(() => {
    const music = audioRef.current;
    const duckedVolume = volume * 0.25;
    const isDucking = isNarrationDucking || isSpeaking;
    const targetVolume = isDucking ? duckedVolume : volume;
    const fadeDuration = isSpeaking ? 280 : 900;
    const startVolume = music?.volume ?? targetVolume;
    let frame = 0;
    let startedAt: number | undefined;

    const fade = (timestamp: number) => {
      if (!music) return;
      startedAt ??= timestamp;
      const progress = Math.min((timestamp - startedAt) / fadeDuration, 1);
      music.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress < 1) frame = window.requestAnimationFrame(fade);
    };

    if (music) frame = window.requestAnimationFrame(fade);
    if (djVoiceAudioRef.current) {
      djVoiceAudioRef.current.volume = 1;
    }

    return () => window.cancelAnimationFrame(frame);
  }, [isNarrationDucking, isSpeaking, volume, audioRef, djVoiceAudioRef]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void updateNowPlaying({
        playback: {
          isPlaying,
          currentTime,
          duration,
          volume
        },
        currentTrack,
        currentPick,
        dj: nowPlayingDj,
        queue: {
          activePlaylistId: activePlaylist?.playlistId ?? null,
          activePlaylistTitle: activePlaylist?.title ?? null,
          length: radioQueue.length,
          nextSongId: radioQueue[0]?.songId ?? null
        }
      }).catch(() => {
        // Now-playing is a read-only output contract; playback should never depend on sync success.
      });
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [activePlaylist?.playlistId, activePlaylist?.title, currentPick, currentTime, currentTrack, duration, isPlaying, nowPlayingDj, radioQueue, volume]);

  const trackMap = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks]);
  const recentPlayed = useMemo(
    () => today.filter((pick) => pick.songId !== currentTrack?.id).slice(0, 3),
    [currentTrack?.id, today]
  );
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateStamp = now
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .replaceAll(" ", " / ")
    .toUpperCase();
  async function refreshAll() {
    const [libraryData, todayData, healthData, calendarData] = await Promise.all([
      getLibrary(),
      getToday(),
      getHealth(),
      getCalendarContext()
    ]);
    setTracks(libraryData.tracks);
    setToday(todayData.picks);
    setHealth(healthData);
    setCalendarStatus(`Calendar context: ${calendarData.label}, ${calendarData.interruptionLevel} mode.`);
    void getKuGouLoginStatus()
      .then(async (login) => {
        setKuGouLoginStatus(login);
        if (!login.loggedIn) return;
        const syncStatus = await getKuGouLibrarySyncStatus();
        setKuGouLibraryStatus(syncStatus);
        const stale = !syncStatus.syncedAt || Date.now() - new Date(syncStatus.syncedAt).getTime() > 6 * 60 * 60 * 1000;
        if (stale) await handleKuGouLibrarySync(true);
      })
      .catch(() => setKuGouLoginStatus({ loggedIn: false, needsLogin: false, reason: "status_unavailable" }));
  }

  function handleKuGouNeedsLogin(error: unknown) {
    if (error instanceof ApiError && error.needsLogin) {
      setKuGouLoginStatus({ loggedIn: false, needsLogin: true, reason: "expired" });
      setStatus("KuGou login expired. Send a code and log in again.");
      return true;
    }
    return false;
  }

  function createManualPick(track: Track, mode: "play" | "queue"): RadioPick {
    return {
      songId: track.id,
      djLine:
        mode === "play"
          ? `Switching to ${track.artist} - ${track.title}.`
          : `Queued next: ${track.artist} - ${track.title}.`,
      reason: mode === "play" ? "Manual play from library." : "Inserted into next-up queue.",
      moodTags: [mode === "play" ? "manual-play" : "manual-queue"],
      source: "rules"
    };
  }

  const unlockVoice = useCallback(() => {
    voiceUnlockedRef.current = true;
    unlockVoiceAudio();
  }, [unlockVoiceAudio]);

  const playPreparedDjVoice = useCallback((restart = true) => {
    const voice = djVoiceAudioRef.current;
    if (!nowPlayingDj?.voiceUrl || !voice) {
      setStatus("DJ voice is still preparing.");
      return Promise.resolve(false);
    }

    if (voice.src !== new URL(nowPlayingDj.voiceUrl, window.location.href).href) {
      voice.src = nowPlayingDj.voiceUrl;
      voice.load();
    }
    if (restart) voice.currentTime = 0;
    voice.playbackRate = 0.86;
    voice.preservesPitch = true;
    setIsSpeaking(true);

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (played: boolean) => {
        if (settled) return;
        settled = true;
        setIsSpeaking(false);
        if (played) setStatus("Fish voice played.");
        resolve(played);
      };
      voice.onended = () => finish(true);
      voice.onerror = () => finish(false);
      void voice.play().catch(() => finish(false));
    });
  }, [nowPlayingDj, setIsSpeaking]);

  const narrationPlayback = useNarrationPlayback({
    audioRef,
    playMusic: (source, restart) => {
      if (restart && audioRef.current) audioRef.current.currentTime = 0;
      playAudioSoon(source);
    },
    pauseMusic: pauseAudio,
    playVoice: (restart) => playPreparedDjVoice(restart) ?? Promise.resolve(false),
    pauseVoice: () => djVoiceAudioRef.current?.pause(),
    stopVoice,
    setDucking: setIsNarrationDucking,
  });

  useEffect(() => {
    if (!currentTrack || nowPlayingDj?.songId !== currentTrack.id) return;
    if (nowPlayingDj.status === "voice_ready" && nowPlayingDj.voiceUrl) narrationPlayback.voiceReady();
    if (nowPlayingDj.status === "voice_failed") narrationPlayback.voiceFailed();
  }, [currentTrack, narrationPlayback, nowPlayingDj]);

  const requestAiDjLine = useCallback(async (pick: RadioPick, scene = "") => {
    const runId = djLineRunRef.current + 1;
    djLineRunRef.current = runId;
    setNowPlayingDj({
      songId: pick.songId,
      say: "",
      voiceUrl: "",
      source: "ai",
      status: "writing"
    });
    setDjLine("");

    try {
      const result = await generateDjLine(pick, scene);
      if (djLineRunRef.current !== runId || result.songId !== pick.songId) return;
      if (!result.usedLlm || result.source !== "ai") return;

      setCurrentPick((current) =>
        current?.songId === result.songId
          ? {
              ...current,
              djLine: result.djLine,
              source: result.source,
              decision: result.decision ?? current.decision
            }
          : current
      );
      setDjLine(result.djLine);
      setNowPlayingDj({
        songId: result.songId,
        say: result.djLine,
        voiceUrl: "",
        source: "ai",
        status: "voice_preparing"
      });

      const voiceResult = await synthesizeDjVoice(result.djLine);
      if (djLineRunRef.current !== runId || result.songId !== pick.songId) return;
      if (!voiceResult.ok) {
        setNowPlayingDj({ songId: pick.songId, say: result.djLine, voiceUrl: "", source: "ai", status: "voice_failed" });
        setStatus("AI DJ narration is ready; Fish voice is unavailable.");
        return;
      }

      setNowPlayingDj({
        songId: result.songId,
        say: result.djLine,
        voiceUrl: voiceResult.audioUrl,
        source: "ai",
        status: "voice_ready"
      });
      setStatus("AI DJ narration and Fish voice are ready.");
    } catch (error) {
      if (djLineRunRef.current === runId) {
        setNowPlayingDj({ songId: pick.songId, say: "", voiceUrl: "", source: "ai", status: "voice_failed" });
        setStatus(error instanceof Error ? `AI DJ narration failed: ${error.message}` : "AI DJ narration failed.");
      }
    }
  }, []);

  const prepareNextDjLine = useCallback((pick: RadioPick, scene = "") => {
    const runId = preparedDjRunRef.current + 1;
    preparedDjRunRef.current = runId;
    preparedDjRef.current = null;

    const promise = (async (): Promise<PreparedDjLine | null> => {
      try {
        const result = await generateDjLine(pick, scene);
        if (preparedDjRunRef.current !== runId || result.songId !== pick.songId) return null;
        if (!result.usedLlm || result.source !== "ai") return null;

        const voiceResult = await synthesizeDjVoice(result.djLine);
        if (preparedDjRunRef.current !== runId || result.songId !== pick.songId) return null;

        const prepared: PreparedDjLine = {
          songId: result.songId,
          line: result.djLine,
          voiceUrl: voiceResult.ok ? voiceResult.audioUrl : "",
          source: "ai"
        };
        preparedDjRef.current = prepared;
        return prepared;
      } catch {
        if (preparedDjRunRef.current === runId) preparedDjRef.current = null;
        return null;
      }
    })();

    preparedDjPromiseRef.current = { songId: pick.songId, promise };
    return promise;
  }, []);

  const hydrateAndPlayPick = useCallback(async (
    pick: RadioPick,
    options: {
      speakFirst?: boolean;
      autoPlay?: boolean;
      scene?: string;
      refineDjLine?: boolean;
      recordHistory?: boolean;
      voiceAlreadyReset?: boolean;
      nextQueue?: RadioPick[];
    } = {}
  ) => {
    const autoPlay = options.autoPlay ?? true;
    if (autoPlay) shouldAutoPlayRef.current = true;
    let track = trackMap.get(pick.songId);

    if (!track) {
      const libraryData = await getLibrary("", 2000);
      setTracks(libraryData.tracks);
      track = libraryData.tracks.find((item) => item.id === pick.songId);
    }

    if (!track) throw new Error("Recommended track is not in the current library.");

    if ((options.recordHistory ?? true) && currentPick && currentPick.songId !== pick.songId) {
      setPlayHistory((items) => [currentPick, ...items.filter((item) => item.songId !== currentPick.songId)].slice(0, 20));
    }

    narrationPlayback.cancel();
    djLineRunRef.current += 1;
    if (!options.voiceAlreadyReset) stopVoice();
    setCurrentPick(pick);
    setCurrentTrack(track);
    setActiveTasteMarks([]);
    setDjFeedbackMark(null);
    setDjLine("");

    const prepared = preparedDjRef.current?.songId === pick.songId ? preparedDjRef.current : null;
    const pendingPrepared = preparedDjPromiseRef.current?.songId === pick.songId
      ? preparedDjPromiseRef.current
      : null;
    if (prepared) preparedDjRef.current = null;
    if (prepared || pendingPrepared) preparedDjPromiseRef.current = null;
    if (prepared) {
      setNowPlayingDj({
        songId: pick.songId,
        say: prepared.line,
        voiceUrl: prepared.voiceUrl,
        source: prepared.source,
        status: prepared.voiceUrl ? "voice_ready" : "voice_failed"
      });
      setDjLine(prepared.line);
      setStatus(
        prepared.voiceUrl
          ? `Prepared AI DJ narration ready for ${track.artist} - ${track.title}`
          : `AI DJ narration ready for ${track.artist} - ${track.title}; Fish voice is unavailable.`
      );
    } else {
      setNowPlayingDj({
        songId: pick.songId,
        say: "",
        voiceUrl: "",
        source: "ai",
        status: "writing"
      });
    }
    if (autoPlay) {
      narrationPlayback.select({
        mode: narrationMode,
        musicSource: `/api/track/${track.id}/stream`,
      });
    }

    const todayData = await getToday();
    setToday(todayData.picks);

    let currentNarration: Promise<unknown> | null = null;
    if (pendingPrepared) {
      const runId = djLineRunRef.current + 1;
      djLineRunRef.current = runId;
      currentNarration = pendingPrepared.promise.then(async (result) => {
        if (djLineRunRef.current !== runId) return;
        if (!result) {
          await requestAiDjLine(pick, options.scene ?? "");
          return;
        }
        setDjLine(result.line);
        setNowPlayingDj({
          songId: result.songId,
          say: result.line,
          voiceUrl: result.voiceUrl,
          source: "ai",
          status: result.voiceUrl ? "voice_ready" : "voice_failed"
        });
      });
    } else if (!prepared) {
      currentNarration = requestAiDjLine(pick, options.scene ?? "");
    }

    const nextQueuedPick = (options.nextQueue ?? radioQueue).find((item) => item.songId !== pick.songId);
    if (nextQueuedPick) {
      const prepareNext = () => void prepareNextDjLine(nextQueuedPick, options.scene ?? "");
      if (currentNarration) {
        void currentNarration.finally(prepareNext);
      } else {
        prepareNext();
      }
    }
  }, [currentPick, narrationMode, narrationPlayback, prepareNextDjLine, radioQueue, requestAiDjLine, stopVoice, trackMap]);

  const handleNext = useCallback(async (scene = query, options: { autoPlay?: boolean } = {}) => {
    stopVoice();
    unlockVoice();
    primeTrackAudio();
    const queuedPick = radioQueue[0];
    if (queuedPick) {
      setRadioQueue((items) => items.slice(1));
      await hydrateAndPlayPick(queuedPick, {
        autoPlay: options.autoPlay ?? shouldAutoPlayRef.current,
        scene,
        voiceAlreadyReset: true,
        nextQueue: radioQueue.slice(1)
      });
      return;
    }

    if (nextInFlightRef.current) return;
    nextInFlightRef.current = true;
    const runId = nextRunRef.current + 1;
    nextRunRef.current = runId;
    const autoPlay = options.autoPlay ?? shouldAutoPlayRef.current;

    setIsLoadingPick(true);
    setStatus("Claudio is selecting the next track.");

    try {
      const pick = await getNextPick(scene);
      if (runId !== nextRunRef.current) return;
      await hydrateAndPlayPick(pick, {
        autoPlay: autoPlay && shouldAutoPlayRef.current,
        scene,
        voiceAlreadyReset: true
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to get the next track.");
    } finally {
      if (runId === nextRunRef.current) {
        setIsLoadingPick(false);
        nextInFlightRef.current = false;
      }
    }
  }, [hydrateAndPlayPick, primeTrackAudio, query, radioQueue, stopVoice, unlockVoice]);

  async function togglePlay() {
    unlockVoice();
    if (!currentTrack) {
      await handleNext();
      return;
    }

    if (narrationPlayback.phase === "paused") {
      shouldAutoPlayRef.current = true;
      narrationPlayback.resume();
    } else if (isPlaying || isSpeaking || narrationPlayback.phase === "overlay") {
      shouldAutoPlayRef.current = false;
      narrationPlayback.pause();
    } else {
      shouldAutoPlayRef.current = true;
      if (narrationPlayback.phase === "music") narrationPlayback.resume();
      else await audioRef.current?.play();
    }
  }

  async function handlePrevious() {
    unlockVoice();
    primeTrackAudio();
    const previous = playHistory[0];
    if (!previous) return;
    setPlayHistory((items) => items.slice(1));
    await hydrateAndPlayPick(previous, { speakFirst: false, recordHistory: false });
  }

  async function handleTaste(action: string) {
    if (!currentTrack) return;

    const isActive = activeTasteMarks.includes(action);
    if (isActive) {
      await removeTaste(currentTrack.id, action);
      setActiveTasteMarks((items) => items.filter((item) => item !== action));
    } else {
      await sendTaste(currentTrack.id, action);
      setActiveTasteMarks((items) => [...new Set([...items, action])]);
    }

    setStatus(isActive ? "Preference mark removed." : "Preference mark saved.");
  }

  async function handleDjFeedback(kind: "approved" | "rejected") {
    if (!currentTrack || !nowPlayingDj || nowPlayingDj.songId !== currentTrack.id || !nowPlayingDj.say.trim()) return;

    try {
      await sendDjSampleFeedback({
        kind,
        text: nowPlayingDj.say,
        songId: currentTrack.id
      });
      setDjFeedbackMark(kind);
      setStatus(kind === "approved" ? "这句已作为低权重风格参考保存。" : "这句已作为高权重避雷样本保存。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "DJ feedback failed.");
    }
  }

  async function handleUseCurrentWeather() {
    if (!navigator.geolocation) {
      setWeatherStatus("Current location is not available in this browser.");
      return;
    }

    setWeatherStatus("Requesting current weather location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void updateWeatherLocation(position.coords.latitude, position.coords.longitude)
          .then((weather) => {
            if (!weather.available) {
              setWeatherStatus("Current location saved, but weather is temporarily unavailable.");
              return;
            }
            const temp = weather.temperature !== undefined ? `, about ${Math.round(weather.temperature)}°C` : "";
            setWeatherStatus(`Current weather ready: ${weather.summary}${temp}. Location name stays private.`);
          })
          .catch((error) => {
            setWeatherStatus(error instanceof Error ? error.message : "Weather location update failed.");
          });
      },
      () => {
        setWeatherStatus("Location permission was not granted. Weather stays on fallback.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 }
    );
  }

  async function handleChatSubmit(event?: FormEvent, override?: string) {
    event?.preventDefault();
    const message = (override ?? chatText).trim();
    if (!message) return;

    unlockVoice();
    setChatText("");
    setChat((items) => [...items, { role: "user", content: message }]);
    setIsChatting(true);

    try {
      const reply: ChatReply = await sendChat(message);
      setChat((items) => [...items, { role: "assistant", content: reply.reply }]);

      if (reply.decision?.say) setDjLine(reply.decision.say);
      if (reply.remembered) setStatus(`Claudio remembered: ${reply.remembered}`);
      if (reply.playlist) {
        setActivePlaylist(reply.playlist);
        setRadioQueue(reply.playlist.picks);
        setStatus(`今日歌单已生成：${reply.playlist.picks.length} 首。`);
      }
      if (reply.queuePick) {
        setRadioQueue((items) => [reply.queuePick!, ...items.filter((item) => item.songId !== reply.queuePick!.songId)]);
        setActivePlaylist((playlist) =>
          playlist ? insertPickIntoPlaylist(playlist, reply.queuePick!, currentTrack?.id) : playlist
        );
        setStatus("Added to next-up queue.");
      }
      if (reply.pick) {
        if (activePlaylist && currentTrack && isPlaying) {
          setRadioQueue((items) => [reply.pick!, ...items.filter((item) => item.songId !== reply.pick!.songId)]);
          setActivePlaylist((playlist) =>
            playlist ? insertPickIntoPlaylist(playlist, reply.pick!, currentTrack.id) : playlist
          );
          setStatus("Added to next-up queue.");
        } else {
          await hydrateAndPlayPick(reply.pick);
          preparedDjRunRef.current += 1;
          preparedDjRef.current = null;
          preparedDjPromiseRef.current = null;
          if (activePlaylist) {
            setRadioQueue((items) => items.filter((item) => item.songId !== reply.pick!.songId));
            setActivePlaylist((playlist) =>
              playlist ? insertPickIntoPlaylist(playlist, reply.pick!, currentTrack?.id) : playlist
            );
          } else {
            setRadioQueue([]);
            setActivePlaylist(null);
          }
        }
      }
    } catch (error) {
      setChat((items) => [
        ...items,
        { role: "assistant", content: error instanceof Error ? error.message : "This conversation failed." }
      ]);
    } finally {
      setIsChatting(false);
    }
  }

  async function handleVoiceInput() {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : undefined;

    if (!SpeechRecognition) {
      setStatus("Voice input requires a Chromium browser with Web Speech support.");
      return;
    }

    if (voiceInputActiveRef.current) {
      const recognition = speechRecognitionRef.current;
      voiceInputActiveRef.current = false;
      speechRecognitionRef.current = null;
      microphoneRef.current?.getTracks().forEach((track) => track.stop());
      microphoneRef.current = null;
      if (voiceInputTimeoutRef.current !== undefined) window.clearTimeout(voiceInputTimeoutRef.current);
      voiceInputTimeoutRef.current = undefined;
      recognition?.abort();
      setIsListening(false);
      setStatus("Voice input stopped.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Microphone access is not available in this browser.");
      return;
    }

    voiceInputActiveRef.current = true;
    setIsListening(true);
    setStatus("Requesting microphone access...");
    voiceInputTimeoutRef.current = window.setTimeout(() => {
      if (!voiceInputActiveRef.current) return;
      voiceInputActiveRef.current = false;
      const recognition = speechRecognitionRef.current;
      speechRecognitionRef.current = null;
      microphoneRef.current?.getTracks().forEach((track) => track.stop());
      microphoneRef.current = null;
      voiceInputTimeoutRef.current = undefined;
      recognition?.abort();
      setIsListening(false);
      setStatus("Voice input timed out. Try again.");
    }, 15_000);

    let microphone: MediaStream;
    try {
      microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      if (!voiceInputActiveRef.current) return;
      voiceInputActiveRef.current = false;
      if (voiceInputTimeoutRef.current !== undefined) window.clearTimeout(voiceInputTimeoutRef.current);
      voiceInputTimeoutRef.current = undefined;
      setIsListening(false);
      const reason = error instanceof DOMException ? error.name : "unknown";
      setStatus(reason === "NotAllowedError" ? "Microphone permission is required for voice input." : `Microphone is unavailable: ${reason}.`);
      return;
    }

    if (!voiceInputActiveRef.current) {
      microphone.getTracks().forEach((track) => track.stop());
      return;
    }
    microphoneRef.current = microphone;

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    let submitted = false;
    setStatus("Listening...");

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results ?? [])
        .map((result: any) => result?.[0]?.transcript ?? "")
        .join("")
        .trim();
      if (transcript) setChatText(transcript);
      const result = event.results?.[event.resultIndex];
      if (!submitted && result?.isFinal && transcript) {
        submitted = true;
        recognition.stop();
        setStatus("Sending voice request...");
        void handleChatSubmit(undefined, transcript);
      }
    };
    recognition.onerror = (event: { error?: string }) => {
      if (!voiceInputActiveRef.current) return;
      const messages: Record<string, string> = {
        "not-allowed": "Microphone permission is required for voice input.",
        "service-not-allowed": "Speech recognition service is disabled in this browser.",
        network: "Speech recognition service is unavailable. Check your network and try again.",
        "no-speech": "No speech was detected. Try again after the microphone starts.",
        "audio-capture": "No usable microphone was found.",
        aborted: "Voice input was cancelled."
      };
      setStatus(messages[event.error ?? ""] ?? `Voice input failed: ${event.error ?? "unknown"}.`);
    };
    recognition.onend = () => {
      if (speechRecognitionRef.current !== recognition) return;
      if (voiceInputTimeoutRef.current !== undefined) window.clearTimeout(voiceInputTimeoutRef.current);
      voiceInputTimeoutRef.current = undefined;
      voiceInputActiveRef.current = false;
      microphoneRef.current?.getTracks().forEach((track) => track.stop());
      microphoneRef.current = null;
      speechRecognitionRef.current = null;
      setIsListening(false);
    };
    try {
      recognition.start();
    } catch (error) {
      if (!voiceInputActiveRef.current) return;
      voiceInputActiveRef.current = false;
      if (voiceInputTimeoutRef.current !== undefined) window.clearTimeout(voiceInputTimeoutRef.current);
      voiceInputTimeoutRef.current = undefined;
      microphoneRef.current?.getTracks().forEach((track) => track.stop());
      microphoneRef.current = null;
      speechRecognitionRef.current = null;
      setIsListening(false);
      setStatus(error instanceof DOMException ? `Voice input could not start: ${error.name}.` : "Voice input could not start.");
    }
  }

  async function handleKuGouLibrarySync(silent = false) {
    setIsImportingPlaylist(true);
    if (!silent) setStatus("正在同步酷狗歌单与歌曲索引。");

    try {
      const result = await syncKuGouLibrary();
      setKuGouLibraryStatus(result);
      const libraryData = await getLibrary();
      setTracks(libraryData.tracks);
      setStatus(`酷狗曲库已同步：${result.playlistCount} 个歌单，${result.trackCount} 首去重歌曲；新增 ${result.added}，更新 ${result.updated}，移除 ${result.removed}。`);
    } catch (error) {
      if (handleKuGouNeedsLogin(error)) return;
      setStatus(error instanceof Error ? error.message : "酷狗曲库同步失败。");
    } finally {
      setIsImportingPlaylist(false);
    }
  }

  async function handleKuGouCaptchaSend() {
    setIsKuGouAuthBusy(true);
    setStatus("Sending KuGou verification code.");
    try {
      await sendKuGouCaptcha(kugouMobile.trim());
      setStatus("KuGou verification code sent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "KuGou captcha failed.");
    } finally {
      setIsKuGouAuthBusy(false);
    }
  }

  async function handleKuGouLogin() {
    setIsKuGouAuthBusy(true);
    setStatus("Logging in to KuGou.");
    try {
      const result = await loginKuGouCellphone({
        mobile: kugouMobile.trim(),
        code: kugouCode.trim(),
        userid: selectedKuGouUserId || undefined
      });
      if (!result.ok) {
        if (result.requiresAccountSelection && result.accounts?.length) {
          setKuGouAccounts(result.accounts);
          setSelectedKuGouUserId(result.accounts[0]?.userid ?? "");
          setStatus("This phone has multiple KuGou accounts. Select one and log in again.");
          return;
        }
        setStatus(result.error ?? "KuGou login failed.");
        return;
      }

      setKuGouLoginStatus(result.status);
      setKuGouAccounts([]);
      setSelectedKuGouUserId("");
      setStatus("KuGou logged in. Syncing library.");
      await handleKuGouLibrarySync();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "KuGou login failed.");
    } finally {
      setIsKuGouAuthBusy(false);
    }
  }

  async function handleKuGouLogout() {
    setIsKuGouAuthBusy(true);
    try {
      const status = await logoutKuGou();
      setKuGouLoginStatus(status);
      setKuGouLibraryStatus(null);
      setKuGouAccounts([]);
      setSelectedKuGouUserId("");
      setStatus("KuGou logged out. You can log in again.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "KuGou logout failed.");
    } finally {
      setIsKuGouAuthBusy(false);
    }
  }

  async function handlePlaylistSelect(pick: RadioPick, index: number) {
    if (!activePlaylist) return;
    unlockVoice();
    primeTrackAudio();
    shouldAutoPlayRef.current = true;
    setRadioQueue(activePlaylist.picks.slice(index + 1));
    await hydrateAndPlayPick(pick, { scene: activePlaylist.scene, autoPlay: true, nextQueue: activePlaylist.picks.slice(index + 1) });
  }

  return (
    <main className="shell">
      <DotGrid className="dot-grid--ambient" />
      <section className="stage">
        <SideRays />
        <TopBar
          theme={theme}
          onThemeToggle={setTheme}
          kugouLibraryStatus={kugouLibraryStatus}
          kugouMobile={kugouMobile}
          kugouCode={kugouCode}
          kugouAccounts={kugouAccounts}
          selectedKuGouUserId={selectedKuGouUserId}
          kugouLoginStatus={kugouLoginStatus}
          isKuGouAuthBusy={isKuGouAuthBusy}
          isImportingPlaylist={isImportingPlaylist}
          onKuGouMobileChange={setKuGouMobile}
          onKuGouCodeChange={setKuGouCode}
          onKuGouUserSelect={setSelectedKuGouUserId}
          onKuGouCaptchaSend={() => void handleKuGouCaptchaSend()}
          onKuGouLogin={() => void handleKuGouLogin()}
          onKuGouLogout={() => void handleKuGouLogout()}
          onHostProfileOpen={openHostProfile}
        />

        <section className="claudio-console">
          <ProfileCard now={now} weekday={weekday} dateStamp={dateStamp} />

          <div className="player-strip">
            <div className="station-spacer" aria-hidden="true" />

            <Player
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isLoadingPick={isLoadingPick}
              isSpeaking={isSpeaking}
              hasDjVoice={!!nowPlayingDj?.voiceUrl}
              recentPlayed={recentPlayed}
              hasPrevious={playHistory.length > 0}
              activeTasteMarks={activeTasteMarks}
              hasTrack={!!currentTrack}
              currentTrack={currentTrack}
              nowPlayingDj={nowPlayingDj}
              audioRef={audioRef}
              djVoiceAudioRef={djVoiceAudioRef}
              onPrevious={handlePrevious}
              onTogglePlay={togglePlay}
              onNext={() => void handleNext()}
              onTaste={(action) => void handleTaste(action)}
              onStopVoice={() => narrationPlayback.cancel()}
              narrationMode={narrationMode}
              onNarrationModeChange={setNarrationMode}
              onSeek={(time) => {
                setCurrentTime(time);
                if (audioRef.current) audioRef.current.currentTime = time;
                narrationPlayback.seek(time * 1000);
              }}
              onVolumeChange={setVolume}
              formatTime={formatTime}
              onHostProfileOpen={openHostProfile}
            />
          </div>

          <PlaylistQueue
            playlist={activePlaylist}
            queue={radioQueue}
            currentTrack={currentTrack}
            trackMap={trackMap}
            onSelectPick={(pick, index) => void handlePlaylistSelect(pick, index)}
          />

          <ChatPanel
            chat={chat}
            isChatting={isChatting}
            chatText={chatText}
            status={status}
            currentTrack={currentTrack}
            isListening={isListening}
            onChatSubmit={(event) => void handleChatSubmit(event)}
            onChatTextChange={setChatText}
            onVoiceInput={handleVoiceInput}
            onHostProfileOpen={openHostProfile}
            hostProfileTriggerRef={hostProfileTriggerRef}
          />

          <AudioPlayer
            audioRef={audioRef}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={(duration) => setDuration(duration)}
            onTimeUpdate={(time) => setCurrentTime(time)}
            onEnded={() => {
              shouldAutoPlayRef.current = true;
              void handleNext(query, { autoPlay: true });
            }}
          />
        </section>
      </section>
      <HostProfileDialog
        open={isHostProfileOpen}
        onClose={() => setIsHostProfileOpen(false)}
        returnFocusRef={hostProfileTriggerRef}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        nowPlayingDj={nowPlayingDj}
        libraryCount={tracks.length}
        todayPlayCount={playHistory.length + (currentTrack ? 1 : 0)}
        gptOnline={Boolean(health?.ai)}
        fishStatus={nowPlayingDj?.voiceUrl ? "online" : nowPlayingDj?.status === "voice_failed" ? "offline" : "standby"}
        kugouOnline={Boolean(kugouLoginStatus?.loggedIn)}
      />
      <ClickSpark />
    </main>
  );
}
