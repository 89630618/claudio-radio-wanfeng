import type { RadioPick, Track } from "../types";

type NowPlayingProps = {
  currentTrack: Track | null;
  currentPick: RadioPick | null;
};

export function NowPlaying({ currentPick }: NowPlayingProps) {
  return (
    <div className="station-row">
      <div>
        <span className="live-dot" />
        <span>Claudio</span>
      </div>
      <small>{currentPick?.source === "ai" ? "AI DJ" : "FAST PICK"}</small>
    </div>
  );
}
