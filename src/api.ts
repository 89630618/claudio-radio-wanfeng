import type {
  ChatReply,
  CalendarContext,
  DjSampleFeedbackKind,
  DjSampleFeedbackResult,
  DjLineResult,
  Health,
  KuGouLoginResult,
  KuGouLoginStatus,
  KuGouLibrarySyncResult,
  KuGouLibrarySyncStatus,
  KuGouPlaylist,
  NowPlayingSnapshot,
  PlaylistLinkInspection,
  PlaylistSuggestion,
  ProgramLineResult,
  ProgramLineType,
  RadioPick,
  TasteProfile,
  TasteTrainingResult,
  TodayPick,
  Track,
  TtsResult,
  WeatherContext
} from "./types";

export class ApiError extends Error {
  needsLogin: boolean;

  constructor(message: string, options: { needsLogin?: boolean } = {}) {
    super(message);
    this.needsLogin = options.needsLogin === true;
  }
}

export async function getHealth(): Promise<Health> {
  const response = await fetch("/api/health");
  return response.json();
}

export async function getNowPlaying(): Promise<NowPlayingSnapshot> {
  const response = await fetch("/api/now");
  return response.json();
}

export async function updateNowPlaying(snapshot: Omit<NowPlayingSnapshot, "updatedAt" | "source">): Promise<NowPlayingSnapshot> {
  const response = await fetch("/api/now", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot)
  });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "Failed to update now-playing snapshot.");
  }

  return response.json();
}

export async function scanLibrary(): Promise<{ ok: boolean; count: number; error?: string }> {
  const response = await fetch("/api/library/scan", { method: "POST" });
  return response.json();
}

export async function getLibrary(query = "", limit = 5000): Promise<{ tracks: Track[]; total: number }> {
  const url = new URL("/api/library", window.location.origin);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url);
  return response.json();
}

export async function getNextPick(query = ""): Promise<RadioPick> {
  const response = await fetch("/api/radio/next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, withWeather: false })
  });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "无法生成下一首推荐");
  }

  return response.json();
}

export async function generateDjLine(pick: RadioPick, query = ""): Promise<DjLineResult> {
  const response = await fetch("/api/dj/line", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      songId: pick.songId,
      query,
      reason: pick.reason,
      moodTags: pick.moodTags,
      previousLine: pick.djLine
    })
  });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "AI DJ 串词生成失败");
  }

  return response.json();
}

export async function generateProgramLine(
  type: ProgramLineType,
  options: {
    scene?: string;
    recentTracks?: Array<{ title?: string; artist?: string }>;
  } = {}
): Promise<ProgramLineResult> {
  const response = await fetch("/api/dj/program-line", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      scene: options.scene ?? "",
      recentTracks: options.recentTracks ?? []
    })
  });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "AI DJ program line failed");
  }

  return response.json();
}

export async function synthesizeDjVoice(text: string, options: { refresh?: boolean } = {}): Promise<TtsResult> {
  const response = await fetch("/api/tts/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, purpose: "dj", refresh: options.refresh === true })
  });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "AI DJ voice failed");
  }

  return response.json();
}

export async function sendDjSampleFeedback(options: {
  kind: DjSampleFeedbackKind;
  text: string;
  songId?: string;
  reason?: string;
}): Promise<DjSampleFeedbackResult> {
  const response = await fetch("/api/dj/sample-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options)
  });

  const result = (await response.json()) as DjSampleFeedbackResult;
  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? "DJ feedback failed" : result.error);
  }
  return result;
}

export async function getRadioQueue(query = "", count = 4): Promise<{ picks: RadioPick[] }> {
  const response = await fetch("/api/radio/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, count, withWeather: false })
  });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "无法生成播放队列");
  }

  return response.json();
}

export async function importPlaylist(playlist: string): Promise<PlaylistSuggestion> {
  const response = await fetch("/api/playlist/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playlist })
  });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "无法导入歌单");
  }

  return response.json();
}

export async function importLatestInboxPlaylist(): Promise<PlaylistSuggestion> {
  const response = await fetch("/api/playlist/inbox/latest", { method: "POST" });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "无法载入最新歌单");
  }

  return response.json();
}

export async function getPendingInboxPlaylist(): Promise<PlaylistSuggestion | null> {
  const response = await fetch("/api/playlist/inbox/pending");

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "无法读取待载入歌单");
  }

  const result = await response.json();
  return result.playlist ?? null;
}

export async function inspectPlaylistLink(url: string): Promise<PlaylistLinkInspection> {
  const response = await fetch("/api/playlist/link/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "无法识别歌单链接");
  }

  return response.json();
}

export async function getKuGouPlaylists(): Promise<KuGouPlaylist[]> {
  const response = await fetch("/api/kugou/playlists");
  const result = await response.json();
  if (!response.ok) {
    throw new ApiError(result.error ?? "KuGou playlists failed.", { needsLogin: result.needsLogin });
  }
  return result.playlists ?? [];
}

export async function getKuGouLoginStatus(): Promise<KuGouLoginStatus> {
  const response = await fetch("/api/kugou/login/status");
  return response.json();
}

export async function logoutKuGou(): Promise<KuGouLoginStatus> {
  const response = await fetch("/api/kugou/logout", { method: "POST" });
  if (!response.ok) throw new Error("KuGou logout failed.");
  return response.json();
}

export async function sendKuGouCaptcha(mobile: string): Promise<void> {
  const response = await fetch("/api/kugou/captcha/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "KuGou captcha failed.");
  }
}

export async function loginKuGouCellphone(options: {
  mobile: string;
  code: string;
  userid?: string;
}): Promise<KuGouLoginResult> {
  const response = await fetch("/api/kugou/login/cellphone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options)
  });
  const result = await response.json();
  if (!response.ok) {
    return { ok: false, error: result.error ?? "KuGou login failed." };
  }
  return result;
}

export async function getKuGouLibrarySyncStatus(): Promise<KuGouLibrarySyncStatus> {
  const response = await fetch("/api/kugou/library/status");
  return response.json();
}

export async function syncKuGouLibrary(): Promise<KuGouLibrarySyncResult> {
  const response = await fetch("/api/kugou/library/sync", { method: "POST" });

  const result = await response.json();
  if (!response.ok) {
    throw new ApiError(result.error ?? "KuGou library sync failed.", { needsLogin: result.needsLogin });
  }
  return result;
}

export async function getToday(): Promise<{ picks: TodayPick[] }> {
  const response = await fetch("/api/radio/today");
  return response.json();
}

export async function getWeather(): Promise<WeatherContext> {
  const response = await fetch("/api/weather");
  const result = await response.json();
  return result.weather;
}

export async function updateWeatherLocation(lat: number, lng: number): Promise<WeatherContext> {
  const response = await fetch("/api/weather/location", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng })
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Weather location update failed");
  }
  return result.weather;
}

export async function getCalendarContext(): Promise<CalendarContext> {
  const response = await fetch("/api/calendar/context");
  const result = await response.json();
  return result.calendar;
}

export async function sendChat(message: string): Promise<ChatReply> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "对话失败");
  }

  return response.json();
}

export async function getTasteProfile(): Promise<TasteProfile> {
  const response = await fetch("/api/taste-profile");
  return response.json();
}

export async function trainTaste(message: string): Promise<TasteTrainingResult> {
  const response = await fetch("/api/taste-profile/train", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  if (!response.ok) {
    const details = await response.json();
    throw new Error(details.error ?? "品味训练失败");
  }

  return response.json();
}

export async function sendTaste(trackId: string, action: string): Promise<void> {
  await fetch("/api/taste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, action })
  });
}

export async function removeTaste(trackId: string, action: string): Promise<void> {
  await fetch("/api/taste", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, action })
  });
}
