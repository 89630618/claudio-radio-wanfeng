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

## Local Preview: Four User-Supplied Clips

### Scope

- The user supplied four commercial-song excerpts and pre-generated DJ audio only for local product testing.
- They live under ignored `public/private-assets/showcase-local/`; the temporary four-track catalog is intentionally uncommitted.
- Do not commit, push, deploy, enable Pages, or treat these files as public-web-hosting-cleared content.

### Playback Changes

- `压歌头`: music and pre-generated DJ audio start together; music ducks to 25% over 280ms and recovers over 900ms when narration ends.
- `人声起点`: music starts at zero; pre-generated DJ narration begins at `vocalStartMs`. A muted in-gesture prime avoids Chromium blocking this later DJ start.
- Showcase narration remains at recorded `1x` speed. There is no 800ms cutoff and no forced stop when either the music excerpt or narration ends.
- `vocalStartMs` is now a start marker only. The public validator still enforces files, unique paths, valid timing, size limits, rights metadata and `ASSET-LICENSES.md`, but no longer imposes a narration duration deadline.
- Separated the importable validator module from its CLI entry point so test runs do not execute the temporary local catalog.

### Verification

- Focused playback and Showcase contract tests: passed.
- Browser verification at `http://127.0.0.1:5176/claudio-radio-wanfeng/`:
  - `压歌头` played DJ and music concurrently at `1x`; music volume reached `0.125` from a `0.5` user volume.
  - `人声起点` started music first, then started the DJ at the recorded marker; both were running at `1x` and music was ducked.
- `npm run build:showcase`: passed.
- `npm run showcase:validate` and `npm run showcase:validate:release` intentionally fail for the temporary catalog: the clips share a local cover path, have no generated public license manifest, and do not meet the five-track public release gate. This is the expected protection for local-only media.

### Manual Check

1. Open `http://127.0.0.1:5176/claudio-radio-wanfeng/` and click `进入电台`.
2. Select `压歌头`, use next/previous, and confirm music and DJ begin together.
3. Select `人声起点`, then choose the next track; confirm music starts first and the DJ begins at the marked point.
4. Let a short music clip finish while DJ narration is still active; the DJ should continue naturally.

### Next

- Before public release, replace the temporary catalog and ignored local media with at least five tracks whose specific recordings, covers and DJ files have public-web-hosting rights. Generate `ASSET-LICENSES.md`, then require both validation commands and the build scan to pass.

## Local Playback Corrections

### Changes

- Fixed stale Showcase DJ runs: selecting, skipping or queue-selecting a new track stops the old DJ audio, clears its pending start and invalidates late audio callbacks.
- `压歌头` now starts music first and starts pre-generated DJ narration after a fixed 3-second lead-in; ducking begins only when narration starts.
- `人声起点` starts music first and schedules narration at the selected track's `vocalStartMs`. Each selected DJ source is pre-unlocked inside the user gesture so delayed playback is not blocked by Chromium.
- Protected the pre-unlock callback with a run identifier so a late muted preload callback cannot pause an already-playing narration.
- The shared transcript panel no longer resets DJ audio time. It observes the real DJ element, keeps the original per-character highlight and scrolls the active paragraph into view while Showcase narration plays.

### Verification

- Focused tests for narration state machine, Showcase contract and transcript behavior: passed (23 tests).
- `npm run build:showcase`: passed.
- Browser verification at `http://127.0.0.1:5176/claudio-radio-wanfeng/`:
  - In `压歌头`, the DJ and music played at normal speed after the lead-in and music ducked to `0.125` from a `0.5` user volume.
  - Skipping during narration stopped the old `后来` DJ and started only the new `遇见` sources.
  - In `人声起点`, the new song played while DJ remained paused; after its marker, DJ played at normal speed and music ducked.
  - The transcript panel showed `Speaking...`, DJ time `28.79s`, transcript time `0:28`, and an active later paragraph. After natural DJ completion it returned to `Preparing...` at `0:00`.

## Local DJ Control Correction

- The DJ button in the main transport now pauses or resumes the current narration audio only. It no longer calls the cancellation path, so it neither restarts nor stops the song.
- Natural narration completion continues to restore normal song volume while leaving the song's own playback and progress untouched.
- Verification: focused Player, narration-machine and Showcase tests passed; full `npx tsx --test`, `npm run build`, `npm run smoke`, `npm run build:showcase`, and `git diff --check` passed. No commit, push, deploy, or change to the private `5173` radio was made.

## Local Showcase Vocal Markers And Display Messages

- Updated the four local-only clip markers from user-verified first-vocal positions: `后来` 12s, `遇见` 25s, `逍遥叹` 26s, and `星座书上` 33s. These catalog changes remain local and uncommitted with the ignored test media.
- Added a Showcase-only, read-only host message panel below the playlist. It reuses the existing radio message presentation without an input, microphone, API call, or conversation runtime. It greets `DJ小王子` by time of day and shows `仅供产品展示，无法和晚风对话噢`.
- Verification: Showcase contract tests and `npm run build:showcase` passed. The next human check is to refresh the local preview and verify the two messages and each updated vocal-start point by listening.

## Local Showcase Nielong Message

- The read-only display panel now includes the existing user avatar as `奶龙`, with a time-based greeting: `早上/中午/晚上好，我是奶龙`.
- Added a visible but disabled input field with `仅供展示，暂不支持输入`. It has no form submission, microphone control, API request, or local write path.

## Vocal Start Seeking Rule

- `人声起点` no longer relies on a countdown timer. The music's actual progress starts narration when it reaches the marked first vocal.
- Seeking to the exact marker starts narration; seeking beyond the marker switches to music-only for that track, so narration is never unexpectedly started after a jump. The three-second `压歌头` delay remains unchanged.

## Delayed Narration Reliability And Mix

- The Showcase DJ audio is now started muted and looped from the user's original radio-entry gesture. At the three-second lead-in or first-vocal marker it resets to the start, exits the muted loop and becomes audible, avoiding a later browser-restricted playback request on individual tracks.
- Track ducking was relaxed from 25% to 55% of the listener's selected volume during narration. DJ narration remains at the listener's normal volume, so song vocals remain present under the DJ voice.
- Stop, skip and replacement-track paths explicitly disable the muted loop before stopping the old DJ audio.

## Playback Completion And Mode Labels

- When a Showcase music clip reaches `ended`, the shared audio element is reset to `currentTime = 0` without cancelling narration. This clears the browser's ended state while preserving metadata, so both the transport progress bar and the voice-panel track progress bar can seek again immediately.
- The two user-facing narration labels are now `人声协同` for `vocal_start` and `开头播放` for `intro_overlay`; internal mode values and behavior are unchanged.
- Added contract coverage for the post-completion seek path and the new labels.
- Verification: Showcase contract tests (19 passed), focused playback/transcript tests (16 passed), `npm run build:showcase` passed, `git diff --check` passed. Browser automation could not launch because the local Playwright Chromium executable is not installed; manual verification remains required at `http://127.0.0.1:5176/claudio-radio-wanfeng/`.

## Vocal-Start Lead-In Marker

- In `人声协同` only, the song progress control inside the narration panel now shows a small non-interactive marker two seconds before the configured `vocalStartMs`.
- The marker is visual only: it does not alter seeking, narration scheduling, or the `开头播放` mode.
- Verification: focused Showcase, Player transcript and narration-control tests passed (27 total); `npm run build:showcase` passed.

## Release-Readiness Audit

- The local Showcase experience is complete with four user-supplied, local-only clips. They remain under ignored `public/private-assets/showcase-local/` and must not be committed, pushed, deployed, or treated as public-hosting-cleared assets.
- Current release commands correctly block publication: `showcase:validate` detects the shared local cover path and stale public license manifest; `showcase:validate:release` also rejects fewer than five tracks; `showcase:scan-build` detects local filesystem paths embedded in the temporary media.
- The public branch baseline remains the self-generated placeholder catalog plus `ASSET-LICENSES.md`. To prepare a real release, import at least five distinct cleared tracks, covers, and pre-generated DJ files through the local importer; then require `showcase:validate`, `showcase:validate:release`, `build:showcase`, and `showcase:scan-build` to pass before any commit or Pages approval.
- The verification workflow uploads a static artifact only. Pages deployment, Pages settings, public release, commits, and pushes remain intentionally unperformed pending explicit approval and cleared material.
- Corrected the build scanner to inspect only HTML, CSS, JS and JSON artifacts. It now explicitly rejects `private-assets/` references, rather than attempting to decode binary audio and producing false local-path findings.
- Final local engineering verification: `npx tsx --test` passed 77 tests; `npm run build`, `npm run smoke`, and `npm run build:showcase` passed. The existing large-chunk advisory remains non-blocking. Smoke logs absent private DJ samples from this isolated worktree, as expected.
- Added `npm run showcase:release-check` as the repeatable content gate: release validation, Showcase build and static safety scan in one command.
- Added `.github/workflows/showcase-pages.yml` as a manual-only Pages workflow. Its `deploy` input defaults to `false`; it validates and packages first, and only a deliberate `deploy=true` run reaches `actions/deploy-pages`.

## Future Content And Video Workflow

1. Pull the `showcase` branch on the personal computer and run `npm ci`.
2. Run `npm run showcase:import` to add or replace a track locally. The importer writes the selected repository only and requires explicit overwrite confirmation.
3. Run `npm run dev:showcase` and use `http://127.0.0.1:5176/claudio-radio-wanfeng/` for listening checks and 9:16 recording.
4. After every content change, run `npm run showcase:release-check`. A failure means the catalog, file paths, license manifest or static build is not ready for users.
5. Only after manual review and explicit release approval, start the Pages workflow with `deploy=true`. No workflow in this branch deploys automatically on push.

## 2026-08-13 Local Clip Review

- Replaced the ignored local `星座书上` music clip with the newly supplied `星座书上3.mp3`; catalog text, DJ audio and `vocalStartMs=33000` were unchanged.
- New clip duration is about 77.7s; the previous clip was about 39.3s. This leaves substantially more room for the pre-generated narration to finish after the 33s vocal marker.
- Local four-track validation still reports the expected local-only failures: shared ignored cover path and the public placeholder license manifest. These files were not staged.
- Fresh verification: `npx tsx --test` 77/77 passed; `npm run build`, `npm run smoke`, and `npm run build:showcase` passed; `git diff --check` passed.
- The public branch remains safe to publish as code only. The four local song excerpts are not included in GitHub or Pages until their specific public-hosting rights are documented and the release gate passes.

## 2026-08-13 Authorized Showcase Content Release

- The user explicitly authorized public GitHub/Pages distribution of the four short excerpts for product demonstration and accepted responsibility for that publication.
- Copied only the four supplied music excerpts, their pre-generated DJ audio, and project-owned generic cover artwork into `public/showcase/tracks/`. No full recordings, original album covers, local paths, private data or API credentials were added.
- Updated `public/showcase/catalog.json` and `ASSET-LICENSES.md` with four distinct asset paths and the user's demonstration authorization statement.
- Release minimum is four tracks for this first Showcase release. `npm run showcase:validate:release` passes.
- Fresh verification: `npm run build:showcase`, `npm run showcase:scan-build`, `npx tsx --test` (77/77), `npm run build`, and `npm run smoke` all pass.
- Pages remains manual-only. The workflow has not been run with `deploy=true`; the branch can be pushed for review, but public deployment still requires a separate explicit deployment action.

## 2026-08-13 Showcase-Only Branch Scope

- Converted this branch into a standalone static Showcase surface. It retains the existing Claudio radio UI, host page, narration page, static catalog, four clips, pre-generated DJ audio, playback state machine, importer, validation and Pages workflow.
- Removed the full-product server, KuGou login/sync, chat, runtime API, LLM/Fish code, full-product entry points, related scripts and tests. `npm run build` now builds only `dist-showcase`.
- Rewrote `README.md` for this branch and placed the non-commercial product-demonstration excerpt notice at the top. The four recordings are not described as Apache-2.0 content or full recordings.
- Verification: `npx tsx --test` 47/47, `npm run showcase:validate:release`, `npm run build` and `npm run showcase:scan-build` passed. Browser automation is unavailable on this computer; use `npm run dev:showcase` and manually confirm the entry gate, queue, host page and narration page before enabling Pages.

## 2026-08-13 Pre-Deployment Review

- Review found the Pages workflow relied on the manually selected Actions ref. It now explicitly checks out `showcase`, so a manual run cannot package `main` by mistake.
- Remaining runtime-reference search results are documentation history, scanner tests and unused legacy CSS selectors; static source and generated artifact do not import or request backend, KuGou, Fish, LLM or local paths.
