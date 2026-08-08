import type { SanitizedCalendarContext } from "./types.js";

function hourOf(date: Date) {
  return date.getHours() + date.getMinutes() / 60;
}

export function getCalendarContext(now = new Date()): SanitizedCalendarContext {
  const hour = hourOf(now);

  if (hour >= 6 && hour < 9) {
    return {
      available: true,
      block: "morning",
      label: "morning",
      interruptionLevel: "normal",
      djGuidance: "保持简短，不做长 opening。",
      nextWindow: "30 min morning block.",
      source: "local-rules"
    };
  }

  if (hour >= 9 && hour < 12) {
    return {
      available: true,
      block: "work",
      label: "work",
      interruptionLevel: "quiet",
      djGuidance: "旁白偏短，减少打断。",
      nextWindow: "30 min work block.",
      source: "local-rules"
    };
  }

  if (hour >= 12 && hour < 14) {
    return {
      available: true,
      block: "lunch",
      label: "lunch",
      interruptionLevel: "normal",
      djGuidance: "保持简短。",
      nextWindow: "30 min lunch block.",
      source: "local-rules"
    };
  }

  if (hour >= 14 && hour < 18) {
    return {
      available: true,
      block: "afternoon",
      label: "afternoon",
      interruptionLevel: "quiet",
      djGuidance: "旁白偏短，减少打断。",
      nextWindow: "30 min afternoon block.",
      source: "local-rules"
    };
  }

  if (hour >= 18 && hour < 23) {
    return {
      available: true,
      block: "evening",
      label: "evening",
      interruptionLevel: "normal",
      djGuidance: "保持简短，不直接写时段。",
      nextWindow: "30 min evening block.",
      source: "local-rules"
    };
  }

  return {
    available: true,
    block: "night",
    label: "night",
    interruptionLevel: "low",
    djGuidance: "更短，不制造兴奋感。",
    nextWindow: "30 min night block.",
    source: "local-rules"
  };
}

export function formatCalendarEnvironment(calendar: SanitizedCalendarContext) {
  if (!calendar.available) return "Calendar: unavailable; do not mention personal schedule.";
  return [
    `Calendar: ${calendar.label}`,
    `Interruption level: ${calendar.interruptionLevel}`,
    `Next window: ${calendar.nextWindow}`,
    "Privacy: no event title, location, attendee, or note is available to the model."
  ].join(" / ");
}

export function formatSchedulerHint(calendar: SanitizedCalendarContext) {
  if (!calendar.available) return "Scheduler: calendar unavailable; use normal concise DJ pacing.";
  return `Scheduler: ${calendar.djGuidance}`;
}
