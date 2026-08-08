import { getTracks, preferApiCatalog } from "../db.js";
import { getKuGouLoginStatus, getKuGouSongPlaybackUrl, healthCheckKuGouApi } from "../kugou.js";

const requestedCount = Number(process.argv[2] ?? 20);
const count = Number.isFinite(requestedCount) ? Math.max(1, Math.min(50, Math.trunc(requestedCount))) : 20;
const tracks = preferApiCatalog(getTracks(5000, "", { playableOnly: true }))
  .sort(() => Math.random() - 0.5)
  .slice(0, count);

const health = await healthCheckKuGouApi();
const login = getKuGouLoginStatus();

console.log("# KuGou playback validation");
console.log(`api_ok=${health.ok}`);
console.log(`logged_in=${login.loggedIn}`);
console.log(`requested=${count}`);
console.log(`sampled=${tracks.length}`);

if (!health.ok) {
  console.error(`api_error=${health.error ?? "unknown"}`);
  process.exitCode = 1;
} else if (!login.loggedIn) {
  console.error(`login_required=${login.reason ?? "not_logged_in"}`);
  process.exitCode = 2;
} else if (tracks.length === 0) {
  console.error("library_has_no_playable_tracks=true");
  process.exitCode = 1;
} else {
  let resolved = 0;
  for (const track of tracks) {
    const startedAt = Date.now();
    const playback = await getKuGouSongPlaybackUrl({ title: track.title, artist: track.artist });
    if (playback) resolved += 1;
    console.log(JSON.stringify({
      title: track.title,
      artist: track.artist,
      resolved: Boolean(playback),
      matchedTitle: playback?.matchedSong.title ?? "",
      matchedArtist: playback?.matchedSong.artist ?? "",
      matchScore: playback?.matchScore ?? 0,
      elapsedMs: Date.now() - startedAt
    }));
  }

  console.log(`resolved=${resolved}`);
  console.log(`success_rate=${Math.round((resolved / tracks.length) * 100)}%`);
}
