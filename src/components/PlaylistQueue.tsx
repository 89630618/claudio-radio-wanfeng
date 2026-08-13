import type { CSSProperties } from "react";
import type { PlaylistSuggestion, RadioPick, Track } from "../showcase/types";

type PlaylistQueueProps = {
  playlist: PlaylistSuggestion | null;
  queue: RadioPick[];
  currentTrack: Track | null;
  trackMap: Map<string, Track>;
  onSelectPick: (pick: RadioPick, index: number) => void;
};

export function PlaylistQueue({ playlist, queue, currentTrack, trackMap, onSelectPick }: PlaylistQueueProps) {
  if (!playlist) return <section className="playlist-queue empty" aria-label="Playlist queue" />;
  const queuedIds = new Set(queue.map((pick) => pick.songId));
  return (
    <section className="playlist-queue" aria-label="Playlist queue">
      <div className="playlist-queue-list">
        {playlist.picks.map((pick, index) => {
          const track = trackMap.get(pick.songId);
          const isCurrent = currentTrack?.id === pick.songId;
          const isQueued = queuedIds.has(pick.songId);
          return (
            <button type="button" key={`${playlist.playlistId}-${pick.songId}`} className={isCurrent ? "playlist-track current" : isQueued ? "playlist-track queued" : "playlist-track played"} style={{ "--queue-delay": `${Math.min(index, 8) * 28}ms` } as CSSProperties & Record<string, string>} onClick={() => onSelectPick(pick, index)} title={`Play ${track?.artist ?? "Unknown Artist"} - ${track?.title ?? pick.songId}`}>
              <span className="playlist-index">{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{track?.title ?? pick.songId}</strong><small>{track?.artist ?? "Unknown Artist"}</small></div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
