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

## 2026-08-13 Mobile Mix And Viewport Correction

- Root cause of the mobile vocal-start mix issue: music ducking was already limited to 55%, but the pre-generated DJ element always remained at 100% output. On phone speakers this made the DJ narration mask soft song vocals.
- In `人声协同` (`vocal_start`), the DJ narration now plays at 62% output while the song keeps the established 55% ducking and timing. `开头播放` retains the existing DJ output level.
- Mobile layouts at 600px and below no longer apply the desktop 9:16 width/height minimization. The radio now fills the safe dynamic viewport, including notch and home-indicator insets; desktop remains centered in its 9:16 stage.
- Verification: regression tests were written first and failed for both behaviors; after implementation `npx tsx --test` passed 49/49, `npm run showcase:release-check` passed (4-track validation, build and static scan), and local browser checks at `360x800`, `390x844`, and `430x932` reported viewport-sized stages with no page-level horizontal or vertical overflow. Next human check: listen to a soft vocal track on a phone in `人声协同` and confirm the singer remains intelligible under the DJ.

## 2026-08-13 Showcase Greeting Periods

- The shared display greeting now follows the requested boundaries for both Claudio and 奶龙: 深夜 `22:00–06:00`, 早上 `06:00–11:00`, 中午 `11:00–13:00`, 下午 `13:00–18:00`, 晚上 `18:00–22:00`.
- Verification: the boundary regression test was added first and failed before implementation; after the change, Showcase contract tests passed 23/23 and `npm run build` passed.

## 2026-08-13 Mobile Narration Panel Progress Visibility

- Root cause of the missing bottom song progress control in the mobile narration panel: the panel used `height: 100%` inside a backdrop that also had safe-area padding. On mobile WebViews this made the panel taller than the visible viewport, so the bottom transport could fall below the screen.
- The narration panel now uses its safe viewport height minus the backdrop and device safe-area insets. The card is a fixed grid: only the transcript body scrolls, while the song progress row remains visible at the bottom of the panel.
- This targets both phone Chrome and WeChat WebView without changing the radio layout, playback behavior, or desktop stage.
- Verification: focused transcript test passed 7/7; complete test suite passed 51/51; `npm run showcase:release-check` passed (4-track release validation, Showcase build, and static safety scan); `git diff --check` passed.
- Human check after deployment: on a phone at `390x844`, enter the radio, open the Claudio voice panel, scroll the transcript to both ends, and confirm the lower song progress bar remains visible and usable. Repeat once in WeChat and confirm the panel stays within the safe area.

## 2026-08-13 Narrow Mobile WebView Correction And Handoff Guide

- Added `docs/SHOWCASE-CODEX-GUIDE.md` for personal-computer Codex handoff: branch setup, local preview, song/DJ import, validation, commit, Pages deployment and network boundaries.
- Added `visualViewport` height synchronization for browser address-bar changes. At widths up to 420px, the existing radio transport switches to a compact two-column layout, moves narration mode and volume to full-width rows, and clips accidental horizontal overflow without replacing the Claudio UI.
- Removed the old mobile voice-panel minimum-height constraint; the panel now follows the real visual viewport and keeps the transcript as the only scrolling area.
- Root cause classification: WeChat screenshot overflow was a narrow-width transport layout issue; Chrome's missing transcript progress was a panel-height/min-height conflict; the third browser screenshot is an external GitHub Pages network/DNS reachability failure and cannot be fixed in frontend code.
- Verification: the new narrow-mobile contract test was red before implementation and green after; Showcase contract tests passed 24/24. Full suite, build, release-check and Pages deployment are still required before publishing this revision.

## 2026-08-13 Desktop Portrait Stage

- Desktop and tablet widths above 600px now center the existing Claudio radio chassis as a complete `9:16` stage. Its size is derived from the current visual viewport with a small outer margin, so it remains fully visible on both wide desktop screens and smaller landscape windows.
- The stage is not scaled internally or reimplemented: the existing player, queue, host page and narration page retain their component tree and interaction behavior. The surrounding browser area remains the environmental background.
- Verification: desktop-portrait regression test was red before implementation and green after. Focused transcript and Showcase contract tests passed 32/32; `npm run build` passed. Full test suite, release check and Pages deployment are next.

## 2026-08-13 Vocal-Start Mix Balance And Rapid Content Workflow

- Kept music ducking at `0.72` of the user's selected volume. A read-only loudness check at each vocal-start window found a material spread: `后来 -15.80 LUFS`, `遇见 -21.91 LUFS`, `逍遥叹 -16.68 LUFS`, and `星座书上 -13.08 LUFS`; a single DJ level would not balance all four.
- Vocal-start DJ gain is now content-calibrated: `后来 0.40`, `遇见 0.30`, `逍遥叹 0.40`, and `星座书上 0.55`. New imported tracks without a calibration retain the safe `0.40` default, so the local importer remains compatible.
- Verification: `npx tsx --test` passed 54/54; `npm run showcase:release-check` passed validation, build and static safety scan; `git diff --check` passed. Remaining manual acceptance: listen on a phone speaker at the vocal entry for `后来` and `遇见` before release.
- Rapid public-content workflow remains gated: prepare the cleared short excerpt, cover, DJ audio, text, and vocal marker locally; import through `npm run showcase:import`; run `npm run showcase:release-check`; manually verify both narration modes; commit and push `showcase`; only then run the manually approved Pages deployment. No API keys, runtime uploads or automatic public deployment are introduced.
- If a new recording remains materially quieter after the global mix change, normalize that music clip offline before import rather than adding per-track runtime gain logic. Keep the public rights record and relative static paths as release prerequisites.

## 2026-08-14 Shared Volume And WeChat Control Correction

- Baseline: this correction was made from the remote `showcase` snapshot `9d13d9f`, which already includes the four per-track `vocalStartDjGain` values. The user's private radio checkout and `main` were not modified.
- Root cause of the remaining phone-speaker mix issue: `VOL` changed only the music element. The DJ element used a separate fixed gain, and dragging `VOL` while DJ ducking was active also restored the song to its non-ducked volume.
- Added `src/showcase/playback-volume.ts`. Music now always uses the selected volume with the existing `0.72` ducking ratio when narration is active. DJ narration now also follows `VOL`; `人声协同` retains its catalog gain and `开头播放` uses the conservative `0.40` gain instead of 100%.
- On WeChat-width screens (`420px` and below), the volume slider now occupies its own full row instead of inheriting the old fixed `70px` width. Its hit area is `30px` tall while retaining the same Claudio transport layout.
- Verification: regression tests were written before the playback and CSS changes. Fresh suite passed `56/56`; `npm run build`, `npm run showcase:validate` (4 tracks) and `npm run showcase:scan-build` passed. Browser measurement at `360x800` confirmed the mobile media query, a `334px` volume row, and a `305px x 30px` slider target.
- Human acceptance before push/deploy: on a WeChat phone speaker, enter the radio, choose `人声协同`, play `后来` and `遇见` through the vocal marker, and drag `VOL` while DJ audio is active. Both tracks should change together with no song-volume jump; the singer should remain understandable. Then confirm `开头播放` narration is clearly below full-volume DJ output.
- Next step: after this listening check, commit/push the correction to `showcase`, then explicitly run the manual Pages workflow if the public site should receive it.

## 2026-08-14 Five-Track Showcase Update

- Added 周杰伦《蒲公英的约定》 from the user-supplied DJ package. The catalog uses its supplied DJ narration text, `vocalStartMs: 29000`, and the safe default `vocalStartDjGain: 0.40`.
- The requested playback order is now: 后来、逍遥叹、蒲公英的约定、遇见、星座书上. The project-owned generic cover is reused at a unique static path for the new track.
- The supplied music file is retained as provided under the user's explicit current release instruction. The asset license entry records the same user-authorized product-demonstration scope as the existing Showcase excerpts.
- Verification: catalog-order regression test was red before the update and green after it. Fresh full suite passed `57/57`; `npm run showcase:validate:release` passed for all five tracks; `npm run build`, `npm run showcase:scan-build`, and `git diff --check` passed. The replacement music clip is `85.056s`, so the `29s` narration start is inside the published clip.
- Published the shared-volume correction and five-track update to remote `showcase` as `816210dd6faa6774cad3698362f29d66a55976a5`.
- Manual Pages workflow `31762934506` completed successfully on 2026-08-14. The public URL returned HTTP `200`: `https://89630618.github.io/claudio-radio-wanfeng/`.

## 2026-08-14 DJ Volume Rollback

- The shared-volume policy made DJ narration too quiet at the Showcase default `VOL` value. The original independent mix is restored: `VOL` controls the music clip only; DJ remains full output in `开头播放` and uses each catalog item's existing `vocalStartDjGain` in `人声协同`.
- The existing music ducking ratio, fade timings, mobile volume slider layout, catalog order, narration timing and all static asset paths are unchanged.
- Verification: test-first regression reproduced the failure at `VOL=10%` (DJ incorrectly became `4%`). After the rollback, focused tests passed `29/29` and `git diff --check` passed. Next: run the release check, publish the Showcase branch, then perform a phone-speaker listening check for both modes.

## 2026-08-14 Per-Track DJ Mix Review

- A five-track EBU R128 review found the actual root cause of the remaining quiet narration report: `蒲公英的约定` DJ source measured `-23.6 LUFS`, while the other DJ files measure between `-11.4` and `-12.4 LUFS`. Its former `0.40` gain made it about `14 dB` quieter than its ducked song vocal.
- Only that supplied DJ file was normalized offline with `+8.5 dB` gain and a `0.85` peak limiter. It now measures `-14.2 LUFS`; its Showcase catalog gain is `0.65`, yielding about `-17.9 LUFS` beside a `-17.2 LUFS` ducked song window. Duration, transcript, timing, music excerpt and every other track gain remain unchanged.
- Regression test was written first and failed with the old `0.40` value. Next: run the complete release gates, publish, then listen to `人声协同` for `蒲公英的约定` on a phone speaker and compare it with `后来`.
