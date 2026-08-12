# Claudio Repository Guidelines

## Scope And Safety

- Work only in the `codex/claudio-showcase` worktree. Do not modify the user's main checkout.
- Keep changes small, reversible, and directly tied to the active phase.
- Do not commit private user data, local music libraries, API keys, account sessions, generated personal history, or private `.data` files.
- Do not enable GitHub Pages, push `main`, or publish assets without explicit user approval.

## Playback Changes

- User-facing modes are `vocal_start` and `intro_overlay`.
- `vocal_start` plays music from zero and begins narration at `vocalStartMs`; `intro_overlay` begins both at zero.
- Preserve 25% ducking, 280ms fade-down, 900ms recovery, and Fish 0.86 speed.
- Cancel stale narration audio, timers, and async results on transport changes.
- Keep LLM, Fish, KuGou, selection, and private profile logic outside static Showcase code.

## Verification

- Write failing behavior tests before production code.
- Run focused tests, `npx tsx --test`, `npm run build`, and `npm run smoke` before a phase claim.
- Update `docs/agent-handoff.md` after each phase with verification and the next human check.
