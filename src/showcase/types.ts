export type ShowcaseTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  musicSrc: string;
  coverSrc: string;
  djText: string;
  djAudioSrc: string;
  vocalStartMs: number;
  vocalStartDjGain?: number;
  rights: {
    status: "cleared";
    scope: "public-web-hosting";
    license: string;
    sourceUrl: string;
    attribution: string;
    verifiedAt: string;
  };
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  folder: string;
  extension: string;
  source: "showcase";
  playable: boolean;
  size: number;
  addedAt: string;
};

export type RadioPick = {
  songId: string;
  djLine: string;
  reason: string;
  moodTags: string[];
  source: "static";
};

export type PlaylistSuggestion = {
  playlistId: string;
  title: string;
  scene: string;
  summary: string;
  picks: RadioPick[];
  source: "static";
  generatedAt: string;
};
