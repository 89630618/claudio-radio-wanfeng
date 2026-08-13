import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { renderAssetLicenses, validateShowcase } from "./validate";
import type { ShowcaseTrack } from "../../src/showcase/types";

function track(overrides: Partial<ShowcaseTrack> = {}): ShowcaseTrack {
  return { id: "test-track", title: "Test Track", artist: "Test Artist", album: "Test Album", musicSrc: "showcase/tracks/test-track/music.wav", coverSrc: "showcase/tracks/test-track/cover.jpg", djText: "Pre-generated narration.", djAudioSrc: "showcase/tracks/test-track/dj.wav", vocalStartMs: 2400, rights: { status: "cleared", scope: "public-web-hosting", license: "Original test fixture", sourceUrl: "https://example.com/source", attribution: "Test fixture", verifiedAt: "2026-08-12" }, ...overrides };
}
async function fixture() { const root = await mkdtemp(join(tmpdir(), "claudio-showcase-")); const folder = join(root, "showcase", "tracks", "test-track"); await mkdir(folder, { recursive: true }); await Promise.all([writeFile(join(folder, "music.wav"), "music"), writeFile(join(folder, "cover.jpg"), "cover"), writeFile(join(folder, "dj.wav"), "voice")]); return root; }

test("importing the validator does not validate the active local catalog", () => {
  assert.ok(typeof validateShowcase === "function");
});

test("validator accepts a cleared track even when its narration continues past vocalStartMs", async () => {
  const publicDir = await fixture(); const catalog = [track()];
  assert.deepEqual(await validateShowcase(catalog, { publicDir, licensesText: renderAssetLicenses(catalog), readAudioDurationMs: async (path) => path.endsWith("dj.wav") ? 3000 : 6000 }), []);
});

test("validator rejects duplicate paths, missing rights, oversized music, and outdated licenses", async () => {
  const publicDir = await fixture(); const first = track({ vocalStartMs: 1800 }); const second = track({ id: "second", rights: { ...first.rights, status: "pending" } as never });
  const errors = await validateShowcase([first, second], { publicDir, licensesText: "outdated", maxMusicBytes: 2, readAudioDurationMs: async () => 1200 });
  assert.ok(errors.some((error) => error.includes("duplicate asset path")));
  assert.ok(errors.some((error) => error.includes("rights.status")));
  assert.ok(!errors.some((error) => error.includes("800ms")));
  assert.ok(errors.some((error) => error.includes("size limit")));
  assert.ok(errors.some((error) => error.includes("ASSET-LICENSES.md")));
});
