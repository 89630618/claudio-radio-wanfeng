# Claudio Repository Guidelines

## Scope And Safety

- Work only in the `codex/claudio-showcase` worktree. Do not modify the user's main checkout.
- Keep changes small, reversible, and directly tied to the active phase.
- Do not commit private user data, local music libraries, API keys, account sessions, generated personal history, or private `.data` files.
- Do not enable GitHub Pages, push `main`, or publish assets without explicit user approval.

## Playback Changes

- Internal modes are `vocal_start` and `intro_overlay`; their user-facing labels are `人声协同` and `开头播放`.
- `vocal_start` plays music from zero and begins narration at `vocalStartMs`; `intro_overlay` begins both at zero.
- Preserve 55% Showcase music ducking, 280ms fade-down, 900ms recovery, and normal-speed pre-generated Showcase narration. Fish's private runtime speed remains an independent full-product setting.
- In Showcase, `vocalStartMs` determines when `vocal_start` begins narration; it does not truncate narration or impose a duration deadline.
- Cancel stale narration audio, timers, and async results on transport changes.
- Keep LLM, Fish, KuGou, selection, and private profile logic outside static Showcase code.

## Verification

- Write failing behavior tests before production code.
- Run focused tests, `npx tsx --test`, `npm run build`, and `npm run smoke` before a phase claim.
- Update `docs/agent-handoff.md` after each phase with verification and the next human check.
