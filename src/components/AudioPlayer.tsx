import type { RefObject } from "react";

type AudioPlayerProps = {
  audioRef: RefObject<HTMLAudioElement | null>;
  onPlay: () => void;
  onPause: () => void;
  onLoadedMetadata: (duration: number) => void;
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
};

export function AudioPlayer({
  audioRef,
  onPlay,
  onPause,
  onLoadedMetadata,
  onTimeUpdate,
  onEnded,
}: AudioPlayerProps) {
  return (
    <audio
      ref={audioRef}
      onPlay={onPlay}
      onPause={onPause}
      onLoadedMetadata={(event) => onLoadedMetadata(event.currentTarget.duration || 0)}
      onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime)}
      onEnded={onEnded}
    />
  );
}
