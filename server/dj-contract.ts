import type { ClaudeDecision, Track } from "./types.js";

export type DjDecisionValidation = {
  ok: boolean;
  reason?: string;
  decision?: ClaudeDecision;
};

export function buildLockedDjFallbackDecision(params: {
  track: Track;
  say: string;
  selectionReason?: string;
  recentLineCount?: number;
}): ClaudeDecision {
  return {
    say: params.say,
    play: [params.track.id],
    reason: [
      "fallback dj-line decision",
      params.selectionReason ? `selection reason: ${params.selectionReason}` : "",
      params.recentLineCount ? `recent lines available: ${params.recentLineCount}` : ""
    ]
      .filter(Boolean)
      .join("; "),
    segue: "talk_first"
  };
}

export function validateLockedDjDecision(params: {
  decision: ClaudeDecision;
  track: Track;
  say: string;
  invalidReason?: string;
  usedFallbackDecision?: boolean;
}): DjDecisionValidation {
  if (params.usedFallbackDecision) {
    return { ok: false, reason: "strict JSON fallback decision" };
  }

  if (params.decision.play.length !== 1 || params.decision.play[0] !== params.track.id) {
    return { ok: false, reason: "strict JSON play mismatch" };
  }

  if (params.invalidReason) {
    return { ok: false, reason: params.invalidReason };
  }

  return {
    ok: true,
    decision: {
      ...params.decision,
      say: params.say,
      play: [params.track.id]
    }
  };
}
