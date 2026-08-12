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
  rights: {
    status: "cleared";
    scope: "public-web-hosting";
    license: string;
    sourceUrl: string;
    attribution: string;
    verifiedAt: string;
  };
};
