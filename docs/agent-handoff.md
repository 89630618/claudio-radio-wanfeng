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
