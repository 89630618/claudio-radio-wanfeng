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

## Follow-up Verification And Fixes

### Changes

- Corrected full-product Fish narration playback to use the Player-rendered DJ audio element. The shared controller now pauses, resumes, cancels and stops the same audio element that drives the transcript UI.
- Changed `dev:showcase` to build then serve the static `dist-showcase` artifact on port `5176`. This prevents the previous Vite development-entry blank screen and makes local review match the future Pages artifact.
- Added Showcase-only compact transport layout through `440px`, keeping the volume and progress controls inside the portrait stage. The full radio stylesheet remains unchanged.

### Verification

- New regression test confirms the full-product controller owns the Player DJ audio element.
- Browser check: first click removes the entry gate and starts the static tracks; the placeholder ends both DJ and music clip by design.
- The Showcase was realigned to the existing radio chassis: it now uses the same `shell` and `stage` layout as the full product, with no dedicated 9:16 stage or extra transcript card. It retains only the static entry gate and hides private taste and voice-panel actions.
- Browser check at the local Showcase URL confirms the shared stage, player and queue are present, chat is absent, no horizontal overflow occurs, and the entry gate can be dismissed.
- Final combined run passed: `npx tsx --test` (52 tests), `npm run build`, `npm run smoke`, `npm run build:showcase`, `npm run showcase:validate`, and `npm run showcase:scan-build`.
- The full build keeps its pre-existing large-chunk advisory. The smoke run logs absent private DJ samples from the isolated worktree, but all smoke checks pass; no private sample was copied into this branch.

## Completion Audit

- Added shared-stage portrait constraints for Showcase review widths while preserving the original Claudio component tree and desktop layout.
- Expanded the verification workflow to run the complete Node test suite and `npm run smoke` before building and scanning the static artifact. The workflow still uploads an artifact only and contains no Pages deployment action.
- README now records the planned Pages URL and explicitly states that Pages is not enabled or publicly deployed by this branch.
- `npm run showcase:validate:release` remains intentionally red: the catalog has one self-generated placeholder instead of the required five cleared public-web-hostable recordings. This is the only release-content gate that cannot be completed without user-provided rights and assets.
- Final engineering verification: `npx tsx --test` passed 54 tests; `npm run build`, `npm run smoke`, `npm run build:showcase`, `npm run showcase:validate`, and `npm run showcase:scan-build` all passed.
- Branch publication follow-up: all five Showcase commits were rewritten with `89630618@users.noreply.github.com` after GitHub rejected the private address. A later branch-only push reached GitHub but the connection was reset on port 443, so the remote branch still requires a retry from a stable GitHub connection. `main` and Pages remain untouched.

## Host And Narration Panel Parity

- Restored the current radio's two viewing paths in Showcase: the top-bar Claudio avatar opens the shared host profile, and the current-song cover opens the shared narration panel. The Claudio avatar in the narration panel also opens the host profile.
- Showcase supplies only static status to the shared host profile: its catalog count, current pre-generated narration and no GPT, Fish runtime or KuGou session. No private configuration or runtime API request is introduced.
- Browser verification on `http://127.0.0.1:5176/claudio-radio-wanfeng/`: entering the radio, opening the narration panel, then opening the host profile from that panel all succeeded.
