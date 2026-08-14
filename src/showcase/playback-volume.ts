import type { NarrationMode } from "../playback/narration-machine";

const musicDuckingGain = 0.72;
const introNarrationGain = 0.4;

export function musicVolume(userVolume: number, ducking: boolean) {
  return userVolume * (ducking ? musicDuckingGain : 1);
}

export function narrationVolume(_userVolume: number, mode: NarrationMode, vocalStartDjGain?: number) {
  return mode === "vocal_start" ? (vocalStartDjGain ?? introNarrationGain) : 1;
}
