# Claudio Agent Handoff

## Baseline

- Upstream base: `4b1fc468f3b4de72f0ad8da789bdde0049707f9c` from `origin/main`.
- Isolated worktree: `C:\Users\pengweihao\Documents\电台补录\.worktrees\claudio-showcase`.
- Branch: `codex/claudio-showcase`; the GitHub push currently fails because this computer cannot connect to `github.com:443`.
- Node `v24.15.0`, npm `11.12.1`.
- Baseline: 38 tests, full build, and smoke pass. Private DJ samples are intentionally absent.

## Phase 1: Shared Narration Playback

### Changes

- Added a framework-independent two-track narration state machine and React Hook.
- Replaced the fixed DJ-start delay with `vocal_start` and `intro_overlay` transport states.
- Added accessible `人声起点` / `压歌头` controls to the existing Player transport strip.
- Stored the preference in `claudio:narration-mode`; changes apply to the next selected track.
- Preserved the full product's selection, LLM, Fish, KuGou, and private configuration flows.
- Full-product tracks do not yet carry `vocalStartMs`; `vocal_start` therefore safely starts narration once its Fish audio is ready. The static Showcase catalog will supply exact vocal points.

### Verification

- Red/green: `src/playback/narration-machine.test.ts` and `src/playback/useNarrationPlayback.test.mjs` first failed because the module and controls did not exist.
- Focused tests: 5 passed.
- `npm run build`: passed; existing large-chunk advisory remains.

### Manual Check

1. In the isolated worktree, run `npm run dev` with private local configuration available.
2. Start a track, switch between `人声起点` and `压歌头`, then select the next track.
3. Confirm `压歌头` ducks music while Fish narration plays, then restores volume.
4. Pause/resume, seek, next, previous, and select a queue track during narration; old narration must not continue.

### Next

- Build the static Showcase from the existing Claudio screen structure, excluding chat, login, backend calls, and private data.

## Phases 2-5: Static Showcase And Release Preparation

### Changes

- Added an isolated static Vite entry and `npm run build:showcase`; `npm run dev:showcase` serves the review build on `127.0.0.1:5176`.
- Reused the existing Claudio shell, stage, `TopBar`, `ProfileCard`, `Player`, `PlaylistQueue`, audio controls, theme and motion. The Showcase only substitutes a static catalog and removes login visibility, chat and backend actions.
- Added a one-click audio unlock layer, static placeholder music/DJ assets, queue controls, 9:16 stage sizing, narration mode persistence and clipped-track behavior: when the pre-generated DJ line ends, the uploaded music clip stops too.
- Added local-only import tooling, generated asset-license manifest, catalog validation, duration/cutoff checks and a 20 MiB music-file limit. The release validator rejects placeholder media and fewer than five tracks.
- Added a build safety scan and a GitHub Actions verification workflow. It uploads a build artifact only; it does not enable GitHub Pages or deploy publicly.

### Verification

- `npx tsx --test src/showcase/showcase-contract.test.mjs scripts/showcase/validate.test.ts scripts/showcase/import-contract.test.mjs scripts/showcase/scan-build.test.ts`: passed.
- `npm run showcase:validate`, `npm run build:showcase`, and `npm run showcase:scan-build`: passed.
- `npm run showcase:validate:release`: intentionally fails until five non-placeholder tracks with public-web-hosting rights are imported.
- No commercial songs were added. Current catalog contains one self-generated behavior placeholder only.

### Manual Check

1. Keep the existing local radio open at `http://localhost:5173/`.
2. Open `http://127.0.0.1:5176/claudio-radio-wanfeng/` to compare the same radio screen structure with static Showcase content.
3. Click `进入电台`, then test play, pause, previous, next, progress, volume and both narration modes.
4. Confirm the Showcase contains no chat input, KuGou login, private profile controls or runtime API traffic.

### Risks And Next

- The static release gate remains blocked until the user supplies five cleared recordings, covers and pre-generated DJ audio. A short clip is not itself a public-hosting license.
- No Pages setting was changed and no public deployment occurred. Push is still pending a working connection to GitHub.
