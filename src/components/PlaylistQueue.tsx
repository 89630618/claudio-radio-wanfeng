import type { CSSProperties } from "react";
import type { PlaylistSuggestion, RadioPick, Track } from "../types";

type PlaylistQueueProps = {
  playlist: PlaylistSuggestion | null;
  queue: RadioPick[];
  currentTrack: Track | null;
  trackMap: Map<string, Track>;
  onSelectPick: (pick: RadioPick, index: number) => void;
};

export function PlaylistQueue({ playlist, queue, currentTrack, trackMap, onSelectPick }: PlaylistQueueProps) {
  if (!playlist) {
    return (
      <section className="playlist-queue empty" aria-label="Playlist queue">
        <div className="playlist-empty">歌单会在这里显示</div>
      </section>
    );
  }

  const queuedIds = new Set(queue.map((pick) => pick.songId));
  const missingTracks = playlist.missingTracks ?? [];
  const isCacheOnly = (track: NonNullable<PlaylistSuggestion["missingTracks"]>[number]) =>
    (track.candidates?.length ?? 0) > 0 &&
    track.candidates!.every((candidate) => candidate.playable === false || candidate.source === "kugou-cache");
  const visibleMissingTracks = missingTracks.filter((track) => !isCacheOnly(track)).slice(0, 3);
  const cacheOnlyCount = missingTracks.length - missingTracks.filter((track) => !isCacheOnly(track)).length;

  return (
    <section className="playlist-queue" aria-label="Playlist queue">
      <div className="playlist-queue-list">
        {playlist.picks.map((pick, index) => {
          const track = trackMap.get(pick.songId);
          const isCurrent = currentTrack?.id === pick.songId;
          const isQueued = queuedIds.has(pick.songId);

          return (
            <button
              type="button"
              key={`${playlist.playlistId}-${pick.songId}`}
              className={isCurrent ? "playlist-track current" : isQueued ? "playlist-track queued" : "playlist-track played"}
              style={{ "--queue-delay": `${Math.min(index, 8) * 28}ms` } as CSSProperties & Record<string, string>}
              onClick={() => onSelectPick(pick, index)}
              title={`播放 ${track?.artist ?? "Unknown Artist"} - ${track?.title ?? pick.songId}`}
            >
              <span className="playlist-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{track?.title ?? pick.songId}</strong>
                <small>{track?.artist ?? "Unknown Artist"}</small>
              </div>
            </button>
          );
        })}
      </div>
      {missingTracks.length > 0 && (
        <div className="playlist-missing" aria-label="Missing imported playlist tracks">
          <strong>{visibleMissingTracks.length > 0 ? `${missingTracks.length} 首未自动匹配` : `${cacheOnlyCount} 首暂不可播放`}</strong>
          {visibleMissingTracks.map((track) => (
            <small key={`${track.title}-${track.artist ?? ""}`}>
              {track.title}
              {track.artist ? ` / ${track.artist}` : ""}
              {track.candidates?.[0]
                ? ` · 候选：${track.candidates[0].artist} - ${track.candidates[0].title}${
                    track.candidates[0].playable === false ? `（不可播放 ${track.candidates[0].extension ?? ""}）` : ""
                  }`
                : ""}
            </small>
          ))}
          {cacheOnlyCount > 0 && (
            <small>{cacheOnlyCount} 首在酷狗缓存中找到，但网页播放器暂不可播放；补 mp3/flac 后可导入。</small>
          )}
        </div>
      )}
    </section>
  );
}
