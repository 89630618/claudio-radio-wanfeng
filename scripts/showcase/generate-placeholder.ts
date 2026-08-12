import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function tone(seconds: number, notes: number[]) {
  const sampleRate = 16_000;
  const samples = Math.floor(seconds * sampleRate);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) {
    const time = index / sampleRate;
    const envelope = Math.min(1, index / 800, (samples - index) / 800);
    const value = notes.reduce((sum, note) => sum + Math.sin(2 * Math.PI * note * time), 0) / notes.length;
    buffer.writeInt16LE(Math.round(value * envelope * 0.2 * 32767), 44 + index * 2);
  }
  return buffer;
}

const root = resolve(import.meta.dirname, "../..");
const trackDir = resolve(root, "public/showcase/tracks/demo-signal");
await mkdir(trackDir, { recursive: true });
await writeFile(resolve(trackDir, "music.wav"), tone(6, [110, 164.81, 220]));
await writeFile(resolve(trackDir, "dj.wav"), tone(1.2, [196, 246.94]));
await copyFile(resolve(root, "src/assets/claudio-avatar-face.jpg"), resolve(trackDir, "cover.jpg"));
